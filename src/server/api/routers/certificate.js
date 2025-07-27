import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateCertificatePDF } from "@/lib/certificateGenerator";
import { existsSync } from "fs";
import path from "path";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const certificateRouter = createTRPCRouter({
  // Generate or get certificate for course completion
  generateCertificate: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { courseId } = input;
      const userId = ctx.session.user.id;

      // Check if user is enrolled and has completed the course
      const courseProgress = await ctx.prisma.courseProgress.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        include: {
          course: {
            include: {
              translations: true,
              instructors: {
                include: {
                  translations: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          user: true,
        },
      });

      if (!courseProgress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course progress not found",
        });
      }

      if (!courseProgress.completed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Course not completed yet",
        });
      }

      // Check if certificate record already exists
      let existingCertificate = await ctx.prisma.certificate.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        include: {
          course: {
            include: {
              translations: true,
            },
          },
        },
      });

      // If certificate record doesn't exist, create it
      if (!existingCertificate) {
        // Generate unique certificate code
        const certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Create certificate record with just the filename (not the full file yet)
        const fileName = `certificate-${certificateCode}.html`;
        const certificateUrl = `/certificates/${fileName}`;

        existingCertificate = await ctx.prisma.certificate.create({
          data: {
            userId,
            courseId,
            certificateUrl,
            certificateCode,
            completedAt: courseProgress.updatedAt,
          },
          include: {
            course: {
              include: {
                translations: true,
              },
            },
          },
        });
      }

      // Check if the actual file exists and handle blob URLs
      let actualCertificateUrl = existingCertificate.certificateUrl;
      let fileName;
      
      // If it's a blob URL, generate a proper filename and update the database
      if (existingCertificate.certificateUrl.startsWith('blob:')) {
        fileName = `certificate-${existingCertificate.certificateCode}.html`;
        actualCertificateUrl = `/certificates/${fileName}`;
        
        // Update the certificate record with the proper URL
        await ctx.prisma.certificate.update({
          where: { id: existingCertificate.id },
          data: { certificateUrl: actualCertificateUrl }
        });
        
        existingCertificate.certificateUrl = actualCertificateUrl;
      } else {
        fileName = existingCertificate.certificateUrl.split('/').pop();
      }
      
      const publicPath = path.join(process.cwd(), 'public', actualCertificateUrl);
      if (!existsSync(publicPath)) {
        // Generate the actual certificate file
        try {
          await generateCertificatePDF({
            userName: courseProgress.user.name || courseProgress.user.email,
            courseName: courseProgress.course.translations.find(t => t.language === 'en')?.courseTitle || 'Course',
            completedDate: courseProgress.updatedAt,
            instructorName: courseProgress.course.instructors[0]?.translations.find(t => t.language === 'en')?.instructorName || 
                          courseProgress.course.instructors[0]?.user?.name || 'Instructor',
            certificateCode: existingCertificate.certificateCode,
            existingFileName: fileName,
          });
          console.log('Certificate file generated successfully:', actualCertificateUrl);
        } catch (error) {
          console.error('Failed to generate certificate file:', error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate certificate file",
          });
        }
      }

      return existingCertificate;
    }),

  // Download certificate - generates file if it doesn't exist
  downloadCertificate: protectedProcedure
    .input(
      z.object({
        certificateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the certificate record
      const certificate = await ctx.prisma.certificate.findUnique({
        where: {
          id: input.certificateId,
        },
        include: {
          course: {
            include: {
              translations: true,
              instructors: {
                include: {
                  translations: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          user: true,
        },
      });

      if (!certificate || certificate.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certificate not found",
        });
      }

             // Check if the file exists, if not generate it
       // Handle both blob URLs and proper file paths
       let actualCertificateUrl = certificate.certificateUrl;
       let fileName;
       
       // If it's a blob URL, generate a proper filename
       if (certificate.certificateUrl.startsWith('blob:')) {
         fileName = `certificate-${certificate.certificateCode}.html`;
         actualCertificateUrl = `/certificates/${fileName}`;
         
         // Update the certificate record with the proper URL
         await ctx.prisma.certificate.update({
           where: { id: certificate.id },
           data: { certificateUrl: actualCertificateUrl }
         });
       } else {
         fileName = certificate.certificateUrl.split('/').pop();
       }
       
       const publicPath = path.join(process.cwd(), 'public', actualCertificateUrl);
       if (!existsSync(publicPath)) {
         try {
           const generatedUrl = await generateCertificatePDF({
             userName: certificate.user.name || certificate.user.email,
             courseName: certificate.course.translations.find(t => t.language === 'en')?.courseTitle || 'Course',
             completedDate: certificate.completedAt,
             instructorName: certificate.course.instructors[0]?.translations.find(t => t.language === 'en')?.instructorName || 
                           certificate.course.instructors[0]?.user?.name || 'Instructor',
             certificateCode: certificate.certificateCode,
             existingFileName: fileName,
           });
           console.log('Certificate file generated for download:', generatedUrl);
         } catch (error) {
           console.error('Failed to generate certificate file for download:', error);
           throw new TRPCError({
             code: "INTERNAL_SERVER_ERROR",
             message: "Failed to generate certificate file",
           });
         }
       }

             return {
         certificateUrl: actualCertificateUrl,
         courseName: certificate.course.translations.find(t => t.language === 'en')?.courseTitle || 'Course',
       };
    }),

  // Get user's certificates
  getUserCertificates: protectedProcedure
    .query(async ({ ctx }) => {
      const certificates = await ctx.prisma.certificate.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        include: {
          course: {
            include: {
              translations: true,
            },
          },
        },
        orderBy: {
          issuedAt: "desc",
        },
      });

      return certificates;
    }),

  // Verify certificate by code (public)
  verifyCertificate: protectedProcedure
    .input(
      z.object({
        certificateCode: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const certificate = await ctx.prisma.certificate.findUnique({
        where: {
          certificateCode: input.certificateCode,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          course: {
            include: {
              translations: true,
            },
          },
        },
      });

      if (!certificate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certificate not found",
        });
      }

      return {
        userName: certificate.user.name || certificate.user.email,
        courseName: certificate.course.translations.find(t => t.language === 'en')?.courseTitle || 'Course',
        completedAt: certificate.completedAt,
        issuedAt: certificate.issuedAt,
        certificateCode: certificate.certificateCode,
      };
    }),

  // Clean up blob URLs in certificates (temporary fix)
  cleanupBlobUrls: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // Find certificates with blob URLs
      const blobCertificates = await ctx.prisma.certificate.findMany({
        where: {
          certificateUrl: {
            startsWith: "blob:",
          },
        },
      });

      // Update each one with a proper URL
      const updatePromises = blobCertificates.map(async (cert) => {
        const fileName = `certificate-${cert.certificateCode}.html`;
        const properUrl = `/certificates/${fileName}`;
        
        return ctx.prisma.certificate.update({
          where: { id: cert.id },
          data: { certificateUrl: properUrl },
        });
      });

      const updatedCertificates = await Promise.all(updatePromises);

      return {
        message: `Cleaned up ${updatedCertificates.length} certificates with blob URLs`,
        updatedCount: updatedCertificates.length,
      };
    }),

  // Admin: Get student certificates
  getStudentCertificates: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const { studentId } = input;

      // Get student info
      const student = await ctx.prisma.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          name: true,
          email: true,
          studentType: true,
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Get completed courses
      const completedCourses = await ctx.prisma.courseProgress.findMany({
        where: {
          userId: studentId,
          completed: true,
        },
        include: {
          course: {
            include: {
              translations: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Get certificates
      const certificates = await ctx.prisma.certificate.findMany({
        where: {
          userId: studentId,
        },
        include: {
          course: {
            include: {
              translations: true,
            },
          },
        },
        orderBy: {
          issuedAt: "desc",
        },
      });

      return {
        student,
        completedCourses,
        certificates,
      };
    }),
}); 