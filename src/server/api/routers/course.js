import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
  publicProcedure,
} from "@/server/api/trpc";

// Helper function to check instructor permissions
async function checkInstructorPermissions(prisma, userId, courseId = null) {
  const instructor = await prisma.instructor.findUnique({
    where: { userId },
    include: {
      permissions: true,
      coursePermissions: courseId
        ? {
            where: { courseId },
          }
        : undefined,
      ownedCourses: courseId
        ? {
            where: { id: courseId },
          }
        : undefined,
    },
  });

  if (!instructor) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Instructor profile not found",
    });
  }

  return {
    instructor,
    isOwner: courseId ? instructor.ownedCourses.length > 0 : false,
    canCreateCourses: instructor.permissions?.canCreateCourses ?? false,
    coursePermissions: courseId ? instructor.coursePermissions[0] : null,
  };
}

const courseSchema = z.object({
  courseLanguage: z.string(),
  courseLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  courseTimezone: z.string(),
  courseStart: z.string().datetime(),
  courseEnd: z.string().datetime(),
  thumbnailUrl: z.string().optional(),
  overviewVideoId: z.string().optional(),
  isDraft: z.boolean().default(true),
  isShown: z.boolean().default(true),
  categoryName: z.string(),
  courseType: z.enum(["SCHOOL_STUDENT", "UNIVERSITY_STUDENT"]),
  courseTotalMinutes: z
    .number()
    .min(1, "Course duration must be at least 1 minute"),
  price: z.number().min(0, "Price must be non-negative").default(0),
  ownerId: z.string().optional(),
  translations: z.array(
    z.object({
      language: z.enum(["ar", "en"]),
      courseTitle: z.string().min(1, "Course title is required"),
      courseDescription: z.string().min(1, "Course description is required"),
      courseBrief: z.string().min(1, "Course brief is required"),
      learningPoints: z.array(z.string()).default([]),
      targetAudience: z.array(z.string()).default([]),
      requirements: z.array(z.string()).default([]),
    })
  ),
});

const unitSchema = z.object({
  order: z.number(),
  isVisible: z.boolean().default(true),
  translations: z.array(
    z.object({
      language: z.enum(["ar", "en"]),
      unitTitle: z.string().min(1, "Unit title is required"),
      unitDescription: z.string().min(1, "Unit description is required"),
    })
  ),
  lessons: z.array(
    z.object({
      order: z.number(),
      videoId: z.string(),
      pdfUrl: z.array(z.string()).default([]),
      isVisible: z.boolean().default(true),
      translations: z.array(
        z.object({
          language: z.enum(["ar", "en"]),
          lessonTitle: z.string().min(1, "Lesson title is required"),
          lessonDescription: z
            .string()
            .min(1, "Lesson description is required"),
        })
      ),
    })
  ),
});

const lessonSchema = z.object({
  translations: z.array(
    z.object({
      language: z.enum(["ar", "en"]),
      lessonTitle: z.string().min(1, "Lesson title is required"),
      lessonDescription: z.string().min(1, "Lesson description is required"),
    })
  ),
  isVisible: z.boolean(),
  videoId: z.string(),
  pdfUrl: z.array(z.string()).default([]),
});

export const courseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(courseSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user is an instructor or admin
      if (
        ctx.session?.user?.role !== "INSTRUCTOR" &&
        ctx.session?.user?.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only instructors and admins can create courses",
        });
      }

      // Get the category by name
      const category = await ctx.prisma.category.findFirst({
        where: {
          translations: {
            some: {
              categoryName: input.categoryName,
            },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // Get the latest c_ID and increment it
      const latestCourse = await ctx.prisma.course.findFirst({
        orderBy: {
          c_ID: "desc",
        },
      });

      const nextCID = (latestCourse?.c_ID ?? 0) + 1;

      // If user is an admin and ownerId is provided, verify the owner exists
      let owner = null;

      if (ctx.session.user.role === "ADMIN" && input.ownerId) {
        owner = await ctx.prisma.instructor.findUnique({
          where: { id: input.ownerId },
          include: {
            translations: true,
          },
        });

        if (!owner) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Instructor not found",
          });
        }
      } else if (ctx.session.user.role === "INSTRUCTOR") {
        // For instructors, get their instructor profile
        owner = await ctx.prisma.instructor.findUnique({
          where: { userId: ctx.session.user.id },
          include: {
            translations: true,
          },
        });

        if (!owner) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Instructor profile not found",
          });
        }
      }

      // Create the course
      const course = await ctx.prisma.course.create({
        data: {
          c_ID: nextCID,
          courseLanguage: input.courseLanguage,
          courseLevel: input.courseLevel,
          courseTimezone: input.courseTimezone,
          courseStart: new Date(input.courseStart),
          courseEnd: new Date(input.courseEnd),
          thumbnailUrl: input.thumbnailUrl,
          overviewVideoId: input.overviewVideoId,
          isDraft: input.isDraft,
          isShown: input.isShown,
          courseType: input.courseType,
          courseTotalMinutes: input.courseTotalMinutes,
          price: input.price,
          categoryId: category.id,
          ownerId: owner?.id,
          instructorIds: [owner?.id],
          translations: {
            create: [
              {
                language: "en",
                courseTitle: input.translations.find((t) => t.language === "en")
                  ?.courseTitle,
                courseDescription: input.translations.find(
                  (t) => t.language === "en"
                )?.courseDescription,
                courseBrief: input.translations.find((t) => t.language === "en")
                  ?.courseBrief,
                learningPoints:
                  input.translations.find((t) => t.language === "en")
                    ?.learningPoints || [],
                targetAudience:
                  input.translations.find((t) => t.language === "en")
                    ?.targetAudience || [],
                requirements:
                  input.translations.find((t) => t.language === "en")
                    ?.requirements || [],
                instructorBio:
                  owner?.translations.find((t) => t.language === "en")
                    ?.instructorBio || "",
              },
              {
                language: "ar",
                courseTitle: input.translations.find((t) => t.language === "ar")
                  ?.courseTitle,
                courseDescription: input.translations.find(
                  (t) => t.language === "ar"
                )?.courseDescription,
                courseBrief: input.translations.find((t) => t.language === "ar")
                  ?.courseBrief,
                learningPoints:
                  input.translations.find((t) => t.language === "ar")
                    ?.learningPoints || [],
                targetAudience:
                  input.translations.find((t) => t.language === "ar")
                    ?.targetAudience || [],
                requirements:
                  input.translations.find((t) => t.language === "ar")
                    ?.requirements || [],
                instructorBio:
                  owner?.translations.find((t) => t.language === "ar")
                    ?.instructorBio || "",
              },
            ],
          },
        },
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
        },
      });

      return course;
    }),

  addUnit: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        unit: unitSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is an admin or course instructor
      if (ctx.session?.user?.role !== "ADMIN") {
        const course = await ctx.prisma.course.findUnique({
          where: { id: input.courseId },
          include: {
            instructors: true,
          },
        });

        if (
          !course?.instructors.some(
            (instructor) => instructor.userId === ctx.session.user.id
          )
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Only course instructors can add units",
          });
        }
      }

      // Create the unit and its lessons in a transaction
      const unit = await ctx.prisma.$transaction(async (tx) => {
        // Create the unit
        const newUnit = await tx.unit.create({
          data: {
            courseId: input.courseId,
            order: input.unit.order,
            isVisible: input.unit.isVisible,
            translations: {
              create: input.unit.translations.map((translation) => ({
                language: translation.language,
                unitTitle: translation.unitTitle,
                unitDescription: translation.unitDescription,
              })),
            },
          },
          include: {
            translations: true,
          },
        });

        // Create lessons for the unit if they exist
        if (input.unit.lessons && input.unit.lessons.length > 0) {
          await Promise.all(
            input.unit.lessons.map((lesson) =>
              tx.lesson.create({
                data: {
                  unitId: newUnit.id,
                  order: lesson.order,
                  videoId: lesson.videoId,
                  pdfUrl: lesson.pdfUrl,
                  isVisible: lesson.isVisible,
                  translations: {
                    create: lesson.translations.map((translation) => ({
                      language: translation.language,
                      lessonTitle: translation.lessonTitle,
                      lessonDescription: translation.lessonDescription,
                    })),
                  },
                },
              })
            )
          );
        }

        // Return the unit with lessons
        return tx.unit.findUnique({
          where: { id: newUnit.id },
          include: {
            translations: true,
            lessons: {
              include: {
                translations: true,
              },
            },
          },
        });
      });

      return unit;
    }),

  updateCourse: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        data: courseSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { isOwner, coursePermissions } = await checkInstructorPermissions(
        ctx.prisma,
        ctx.session.user.id,
        input.courseId
      );

      // Check if user has permission to update
      if (!isOwner && !coursePermissions?.canUpdate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this course",
        });
      }

      // Get the category if categoryName is provided
      let categoryId;

      if (input.data.categoryName) {
        const category = await ctx.prisma.category.findFirst({
          where: {
            translations: {
              some: {
                categoryName: input.data.categoryName,
              },
            },
          },
        });

        if (!category) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }
        categoryId = category.id;
      }

      // Update the course
      const updatedCourse = await ctx.prisma.course.update({
        where: { id: input.courseId },
        data: {
          ...(input.data.courseLanguage && {
            courseLanguage: input.data.courseLanguage,
          }),
          ...(input.data.courseLevel && {
            courseLevel: input.data.courseLevel,
          }),
          ...(input.data.courseTimezone && {
            courseTimezone: input.data.courseTimezone,
          }),
          ...(input.data.courseStart && {
            courseStart: new Date(input.data.courseStart),
          }),
          ...(input.data.courseEnd && {
            courseEnd: new Date(input.data.courseEnd),
          }),
          ...(input.data.thumbnailUrl && {
            thumbnailUrl: input.data.thumbnailUrl,
          }),
          ...(input.data.overviewVideoId && {
            overviewVideoId: input.data.overviewVideoId,
          }),
          ...(typeof input.data.isDraft !== "undefined" && {
            isDraft: input.data.isDraft,
          }),
          ...(typeof input.data.isShown !== "undefined" && {
            isShown: input.data.isShown,
          }),
          ...(input.data.courseType && {
            courseType: input.data.courseType,
          }),
          ...(typeof input.data.courseTotalMinutes !== "undefined" && {
            courseTotalMinutes: input.data.courseTotalMinutes,
          }),
          ...(typeof input.data.price !== "undefined" && {
            price: input.data.price,
          }),
          ...(categoryId && { categoryId }),
          updatedById: ctx.session.user.id,
          ...(input.data.translations && {
            translations: {
              deleteMany: {},
              create: input.data.translations.map((translation) => ({
                language: translation.language,
                courseTitle: translation.courseTitle,
                courseDescription: translation.courseDescription,
                courseBrief: translation.courseBrief,
                learningPoints: translation.learningPoints || [],
                targetAudience: translation.targetAudience || [],
                requirements: translation.requirements || [],
              })),
            },
          }),
        },
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
          updatedBy: {
            select: {
              name: true,
            },
          },
        },
      });

      return updatedCourse;
    }),

  deleteCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isOwner, coursePermissions } = await checkInstructorPermissions(
        ctx.prisma,
        ctx.session.user.id,
        input.courseId
      );

      // Only owners or instructors with delete permission can delete
      if (!isOwner && !coursePermissions?.canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this course",
        });
      }

      await ctx.prisma.course.delete({
        where: { id: input.courseId },
      });

      return { success: true };
    }),

  // Admin procedures for managing permissions
  updateInstructorPermissions: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
        canCreateCourses: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only admins can update instructor permissions",
        });
      }

      return ctx.prisma.instructorPermission.upsert({
        where: { instructorId: input.instructorId },
        update: { canCreateCourses: input.canCreateCourses },
        create: {
          instructorId: input.instructorId,
          canCreateCourses: input.canCreateCourses,
        },
      });
    }),

  updateCoursePermissions: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
        courseId: z.string(),
        permissions: z.object({
          canUpdate: z.boolean(),
          canDelete: z.boolean(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin or course owner
      if (ctx.session?.user?.role !== "ADMIN") {
        const { isOwner } = await checkInstructorPermissions(
          ctx.prisma,
          ctx.session.user.id,
          input.courseId
        );

        if (!isOwner) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Only admins or course owners can update course permissions",
          });
        }
      }

      return ctx.prisma.coursePermission.upsert({
        where: {
          instructorId_courseId: {
            instructorId: input.instructorId,
            courseId: input.courseId,
          },
        },
        update: {
          canUpdate: input.permissions.canUpdate,
          canDelete: input.permissions.canDelete,
        },
        create: {
          instructorId: input.instructorId,
          courseId: input.courseId,
          canUpdate: input.permissions.canUpdate,
          canDelete: input.permissions.canDelete,
        },
      });
    }),

  getCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.prisma.course.findUnique({
        where: { id: input.courseId },
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
          units: {
            include: {
              translations: true,
              lessons: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      return course;
    }),

  // Admin procedures
  getAllCoursesAdmin: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).default(10),
        searchQuery: z.string().optional(),
        statusFilter: z
          .enum(["ALL", "DRAFT", "PUBLISHED", "HIDDEN"])
          .default("ALL"),
        typeFilter: z
          .enum(["ALL", "UNIVERSITY_STUDENT", "SCHOOL_STUDENT"])
          .default("ALL"),
        languageFilter: z.enum(["ALL", "Arabic", "English"]).default("ALL"),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only admins can access this endpoint",
        });
      }

      // Build the where clause based on filters
      const where = {
        ...(input.statusFilter !== "ALL" && {
          ...(input.statusFilter === "DRAFT" && { isDraft: true }),
          ...(input.statusFilter === "PUBLISHED" && {
            isDraft: false,
            isShown: true,
          }),
          ...(input.statusFilter === "HIDDEN" && {
            isDraft: false,
            isShown: false,
          }),
        }),
        ...(input.typeFilter !== "ALL" && { courseType: input.typeFilter }),
        ...(input.languageFilter !== "ALL" && {
          courseLanguage: input.languageFilter,
        }),
        ...(input.searchQuery && {
          OR: [
            {
              translations: {
                some: {
                  courseTitle: {
                    contains: input.searchQuery,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              owner: {
                user: {
                  name: {
                    contains: input.searchQuery,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              category: {
                translations: {
                  some: {
                    categoryName: {
                      contains: input.searchQuery,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          ],
        }),
      };

      // Get total count for pagination
      const totalCourses = await ctx.prisma.course.count({ where });

      // Get paginated courses with all necessary relations
      const courses = await ctx.prisma.course.findMany({
        where,
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
          instructors: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  accountStatus: true,
                },
              },
              translations: true,
              coursePermissions: {
                where: {
                  courseId: { equals: undefined }, // This will be replaced in the map below
                },
              },
            },
          },
          owner: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  accountStatus: true,
                },
              },
              translations: true,
            },
          },
          permissions: true, // Changed from coursePermissions to permissions
          units: {
            include: {
              translations: true,
            },
          },
          enrolledStudents: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      });

      // Map the courses to include the correct permissions for each instructor
      const processedCourses = courses.map((course) => ({
        ...course,
        instructors: course.instructors.map((instructor) => ({
          ...instructor,
          coursePermissions: course.permissions.filter(
            (permission) => permission.instructorId === instructor.id
          ),
        })),
      }));

      return {
        courses: processedCourses,
        pagination: {
          currentPage: input.page,
          totalPages: Math.ceil(totalCourses / input.pageSize),
          totalCourses,
          hasMore: input.page * input.pageSize < totalCourses,
        },
      };
    }),

  updateCourseAdmin: adminProcedure
    .input(
      z.object({
        courseId: z.string(),
        data: courseSchema.extend({
          instructorIds: z.array(z.string()).optional(),
          ownerId: z.string().optional(),
          enrolledStudentIds: z.array(z.string()).optional(),
          instructorPermissions: z
            .array(
              z.object({
                instructorId: z.string(),
                courseId: z.string(),
                canUpdate: z.boolean(),
                canDelete: z.boolean(),
              })
            )
            .optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only admins can update courses",
        });
      }

      // Get the category
      const category = await ctx.prisma.category.findFirst({
        where: {
          translations: {
            some: {
              categoryName: input.data.categoryName,
            },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // Delete existing permissions first
      await ctx.prisma.coursePermission.deleteMany({
        where: {
          courseId: input.courseId,
        },
      });

      // Only create new permissions if there are any to create
      if (input.data.instructorPermissions?.length > 0) {
        await ctx.prisma.coursePermission.createMany({
          data: input.data.instructorPermissions,
        });
      }

      // Update the course
      const updatedCourse = await ctx.prisma.course.update({
        where: { id: input.courseId },
        data: {
          courseLanguage: input.data.courseLanguage,
          courseLevel: input.data.courseLevel,
          courseTimezone: input.data.courseTimezone,
          courseStart: new Date(input.data.courseStart),
          courseEnd: new Date(input.data.courseEnd),
          thumbnailUrl: input.data.thumbnailUrl,
          overviewVideoId: input.data.overviewVideoId,
          isDraft: input.data.isDraft,
          isShown: input.data.isShown,
          courseType: input.data.courseType,
          courseTotalMinutes: input.data.courseTotalMinutes,
          price: input.data.price, // Make sure price is included in the update
          categoryId: category.id,
          ownerId: input.data.ownerId,
          instructorIds: input.data.instructorIds || [], // Ensure we have an empty array if no instructors
          enrolledStudentIds: input.data.enrolledStudentIds,
          updatedById: ctx.session.user.id,
          translations: {
            deleteMany: {},
            create: input.data.translations.map((t) => ({
              language: t.language,
              courseTitle: t.courseTitle,
              courseDescription: t.courseDescription,
              courseBrief: t.courseBrief,
              learningPoints: t.learningPoints || [],
              targetAudience: t.targetAudience || [],
              requirements: t.requirements || [],
            })),
          },
        },
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
          instructors: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  accountStatus: true,
                },
              },
              translations: true,
              coursePermissions: true,
            },
          },
          owner: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              translations: true,
            },
          },
          Review: true,
          enrolledStudents: {
            select: {
              id: true,
              name: true,
              email: true,
              studentType: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updatedCourse;
    }),

  deleteCourseAdmin: adminProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only admins can delete courses",
        });
      }

      // First get the course with all video IDs
      const course = await ctx.prisma.course.findUnique({
        where: { id: input.courseId },
        include: {
          units: {
            include: {
              lessons: {
                select: {
                  videoId: true,
                },
              },
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Collect all video IDs (overview video and lesson videos)
      const videoIds = [course.overviewVideoId];

      course.units.forEach((unit) => {
        unit.lessons.forEach((lesson) => {
          if (lesson.videoId) {
            videoIds.push(lesson.videoId);
          }
        });
      });

      // Delete all videos from Bunny storage
      const deleteVideoPromises = videoIds
        .filter(Boolean) // Remove null/undefined values
        .map((videoId) =>
          fetch(
            `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos/${videoId}`,
            {
              method: "DELETE",
              headers: {
                Accept: "application/json",
                AccessKey: env.BUNNY_VIDEOS_LIBRARY_PASSWORD,
              },
            }
          ).catch((error) => {
            // Log error but don't fail the operation
            console.error(`Failed to delete video ${videoId}:`, error);
          })
        );

      // Wait for all video deletions to complete
      await Promise.all(deleteVideoPromises);

      // Get the lesson and unit IDs for deletion
      const lessonIds = await ctx.prisma.lesson
        .findMany({
          where: {
            unit: { courseId: input.courseId },
          },
          select: { id: true },
        })
        .then((lessons) => lessons.map((l) => l.id));

      const unitIds = await ctx.prisma.unit
        .findMany({
          where: { courseId: input.courseId },
          select: { id: true },
        })
        .then((units) => units.map((u) => u.id));

      // Delete all related data in a transaction
      return ctx.prisma
        .$transaction([
          // Delete course progress
          ctx.prisma.courseProgress.deleteMany({
            where: { courseId: input.courseId },
          }),
          // Delete reviews
          ctx.prisma.review.deleteMany({
            where: { courseId: input.courseId },
          }),
          // Delete course permissions
          ctx.prisma.coursePermission.deleteMany({
            where: { courseId: input.courseId },
          }),
          // Delete user favorites
          ctx.prisma.userFavorite.deleteMany({
            where: { courseId: input.courseId },
          }),
          // Delete wallet transactions
          ctx.prisma.courseTransaction.deleteMany({
            where: { courseId: input.courseId },
          }),
          // Delete translations for lessons
          ctx.prisma.translation.deleteMany({
            where: {
              lessonId: {
                in: lessonIds,
              },
            },
          }),
          // Delete translations for units
          ctx.prisma.translation.deleteMany({
            where: {
              unitId: {
                in: unitIds,
              },
            },
          }),
          // Delete translations for course
          ctx.prisma.translation.deleteMany({
            where: { courseId: input.courseId },
          }),
          // Delete lessons
          ctx.prisma.lesson.deleteMany({
            where: {
              unit: { courseId: input.courseId },
            },
          }),
          // Delete units
          ctx.prisma.unit.deleteMany({
            where: { courseId: input.courseId },
          }),
          // Finally delete the course
          ctx.prisma.course.delete({
            where: { id: input.courseId },
          }),
        ])
        .then(() => ({ success: true }));
    }),

  getCourseUnits: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const units = await ctx.prisma.unit.findMany({
        where: { courseId: input.courseId },
        include: {
          translations: true,
          lessons: {
            include: {
              translations: true,
              quiz: {
                include: {
                  questions: {
                    include: {
                      translations: true,
                      options: {
                        include: {
                          translations: true,
                        },
                        orderBy: { order: "asc" },
                      },
                    },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      });

      return units;
    }),

  getPublicCourses: protectedProcedure
    .input(
      z.object({
        searchQuery: z.string().optional(),
        language: z.string().optional(),
        categoryId: z.string().optional(),
        duration: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get the user's student type
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { studentType: true },
      });

      if (!user?.studentType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User student type not set",
        });
      }

      // Build the where clause based on filters
      const where = {
        isDraft: false,
        isShown: true,
        courseType: user.studentType,
        courseStart: { not: null },
        courseEnd: { not: null },
        ...(input.language && { courseLanguage: input.language }),
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.searchQuery && {
          translations: {
            some: {
              OR: [
                {
                  courseTitle: {
                    contains: input.searchQuery,
                    mode: "insensitive",
                  },
                },
                {
                  courseDescription: {
                    contains: input.searchQuery,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        }),
      };

      const courses = await ctx.prisma.course.findMany({
        where,
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
          Review: true,
          enrolledStudents: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Filter courses based on duration
      const filteredCourses = courses.filter((course) => {
        if (!input.duration) return true;

        const start = new Date(course.courseStart);
        const end = new Date(course.courseEnd);
        const durationInDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        switch (input.duration) {
          case "short":
            return durationInDays < 28; // Less than 4 weeks
          case "medium":
            return durationInDays >= 28 && durationInDays < 90; // 1-3 months
          case "long":
            return durationInDays >= 90; // More than 3 months
          default:
            return true;
        }
      });

      return filteredCourses.map((course) => ({
        id: course.id,
        title: {
          en:
            course.translations.find((t) => t.language === "en")?.courseTitle ||
            "",
          ar:
            course.translations.find((t) => t.language === "ar")?.courseTitle ||
            "",
        },
        description: {
          en:
            course.translations.find((t) => t.language === "en")
              ?.courseDescription || "",
          ar:
            course.translations.find((t) => t.language === "ar")
              ?.courseDescription || "",
        },
        students: course.enrolledStudents.length,
        rating: Number(
          (
            course.Review.reduce((acc, review) => acc + review.rating, 0) /
            (course.Review.length || 1)
          ).toFixed(1)
        ),
        image: course.thumbnailUrl || "",
        price: course.price,
      }));
    }),

  getFilteredCourses: publicProcedure
    .input(
      z.object({
        levels: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
        subjects: z.array(z.string()).optional(),
        ratings: z.array(z.string()).optional(),
        sortBy: z.enum(["newest", "popular", "rating"]).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).default(6),
        studentType: z
          .enum(["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"])
          .nullable()
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build where clause based on filters
      const where = {
        isDraft: false,
        isShown: true,
        ...(input.studentType && { courseType: input.studentType }),
        ...(input.languages?.length && {
          courseLanguage: { in: input.languages },
        }),
        ...(input.subjects?.length && {
          categoryId: { in: input.subjects },
        }),
        ...(input.levels?.length && {
          courseLevel: { in: input.levels },
        }),
      };

      // Add rating filter if specified
      if (input.ratings?.length) {
        where.Review = {
          some: {
            rating: {
              in: input.ratings.map(Number),
            },
          },
        };
      }

      // First get total count for pagination
      const totalCourses = await ctx.prisma.course.count({ where });

      // Determine sort order
      let orderBy = {};

      switch (input.sortBy) {
        case "newest":
          orderBy = { createdAt: "desc" };
          break;
        case "popular":
          orderBy = {
            enrolledStudents: {
              _count: "desc",
            },
          };
          break;
        case "rating":
          orderBy = {
            Review: {
              _avg: {
                rating: "desc",
              },
            },
          };
          break;
        default:
          orderBy = { updatedAt: "desc" };
      }

      // Then get the courses for current page
      const courses = await ctx.prisma.course.findMany({
        where,
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
          Review: true,
          enrolledStudents: {
            select: {
              id: true,
            },
          },
          instructors: {
            where: {
              user: {
                accountStatus: "ACTIVE",
              },
            },
            select: {
              user: {
                select: {
                  name: true,
                  image: true,
                },
              },
              translations: true,
            },
          },
        },
        orderBy,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      });

      return {
        courses: courses.map((course) => ({
          id: course.id,
          title: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseTitle || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseTitle || "",
          },
          description: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseDescription || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseDescription || "",
          },
          students: course.enrolledStudents.length,
          rating: Number(
            (
              course.Review.reduce((acc, review) => acc + review.rating, 0) /
              (course.Review.length || 1)
            ).toFixed(1)
          ),
          image: course.thumbnailUrl || "",
          price: course.price,
        })),
        totalCourses,
      };
    }),

  enrollInCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the course
      const course = await ctx.prisma.course.findUnique({
        where: { id: input.courseId },
        include: {
          enrolledStudents: {
            select: { id: true },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Check if user is already enrolled
      if (course.enrolledStudentIds.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already enrolled in this course",
        });
      }

      // Get user's wallet
      const wallet = await ctx.prisma.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Wallet not found",
        });
      }

      // Check if user has sufficient balance
      if (wallet.balance < course.price) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient wallet balance",
        });
      }

      // Create transaction and enroll user in a transaction
      return ctx.prisma.$transaction(async (tx) => {
        // Create wallet transaction
        const walletTransaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -course.price, // Negative amount for purchase
            type: "COURSE_PURCHASE",
            status: "COMPLETED",
            courseId: course.id,
          },
        });

        // Create course transaction
        await tx.courseTransaction.create({
          data: {
            courseId: course.id,
            userId: ctx.session.user.id,
            walletTransactionId: walletTransaction.id,
            purchasePrice: course.price,
            status: "COMPLETED",
          },
        });

        // Update wallet balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              decrement: course.price,
            },
          },
        });

        // Enroll user in course
        const updatedCourse = await tx.course.update({
          where: { id: course.id },
          data: {
            enrolledStudentIds: {
              push: ctx.session.user.id,
            },
          },
          include: {
            translations: true,
            enrolledStudents: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Create initial course progress
        await tx.courseProgress.create({
          data: {
            userId: ctx.session.user.id,
            courseId: course.id,
            progress: 0,
            completed: false,
          },
        });

        return updatedCourse;
      });
    }),

  getPopularCourses: publicProcedure
    .input(
      z.object({
        studentType: z
          .enum(["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"])
          .nullable()
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        isDraft: false,
        isShown: true,
        ...(input.studentType
          ? { courseType: input.studentType }
          : { courseType: { in: ["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"] } }),
      };

      const courses = await ctx.prisma.course.findMany({
        where,
        include: {
          translations: true,
          Review: true,
          enrolledStudents: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          enrolledStudents: {
            _count: "desc",
          },
        },
        take: 8,
      });

      return courses.map((course) => {
        const rating =
          course.Review.reduce((acc, review) => acc + review.rating, 0) /
          (course.Review.length || 1);

        return {
          id: course.id,
          title: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseTitle || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseTitle || "",
          },
          description: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseDescription || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseDescription || "",
          },
          students: course.enrolledStudents.length,
          rating: Number(rating.toFixed(1)),
          image: course.thumbnailUrl || "",
          price: course.price,
        };
      });
    }),

  getRecentCourses: publicProcedure
    .input(
      z.object({
        studentType: z
          .enum(["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"])
          .nullable()
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        isDraft: false,
        isShown: true,
        ...(input.studentType
          ? { courseType: input.studentType }
          : { courseType: { in: ["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"] } }),
      };

      const courses = await ctx.prisma.course.findMany({
        where,
        take: 8,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          translations: true,
          Review: true,
          enrolledStudents: {
            select: {
              id: true,
            },
          },
          instructors: {
            where: {
              user: {
                accountStatus: "ACTIVE",
              },
            },
            select: {
              user: {
                select: {
                  name: true,
                  image: true,
                },
              },
              translations: true,
            },
          },
        },
      });

      return courses.map((course) => {
        const rating =
          course.Review.reduce((acc, review) => acc + review.rating, 0) /
          (course.Review.length || 1);
        const instructor = course.instructors[0]?.user
          ? {
              name: course.instructors[0].user.name || "",
              image: course.instructors[0].user.image || "",
              bio: {
                en:
                  course.instructors[0].translations.find(
                    (t) => t.language === "en"
                  )?.instructorBio || "",
                ar:
                  course.instructors[0].translations.find(
                    (t) => t.language === "ar"
                  )?.instructorBio || "",
              },
            }
          : null;

        return {
          id: course.id,
          title: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseTitle || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseTitle || "",
          },
          description: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseDescription || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseDescription || "",
          },
          students: course.enrolledStudents.length,
          rating: Number(rating.toFixed(1)),
          image: course.thumbnailUrl || "",
          instructor,
          price: course.price,
        };
      });
    }),

  getLessonByOrder: protectedProcedure
    .input(
      z.object({
        unitId: z.string(),
        lessonOrder: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const lesson = await ctx.prisma.lesson.findFirst({
        where: {
          unitId: input.unitId,
          order: input.lessonOrder,
        },
        include: {
          translations: true,
          quiz: {
            include: {
              questions: {
                include: {
                  translations: true,
                  options: {
                    include: {
                      translations: true,
                    },
                    orderBy: { order: "asc" },
                  },
                },
                orderBy: { order: "asc" },
              },
            },
          },
          unit: {
            include: {
              translations: true,
              course: {
                include: {
                  translations: true,
                  units: {
                    include: {
                      translations: true,
                      lessons: {
                        include: {
                          translations: true,
                        },
                        orderBy: {
                          order: "asc",
                        },
                      },
                    },
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found",
        });
      }

      return lesson;
    }),

  createUnit: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        data: z.object({
          translations: z.array(
            z.object({
              language: z.enum(["ar", "en"]),
              unitTitle: z.string().min(1),
              unitDescription: z.string().min(1),
            })
          ),
          isVisible: z.boolean(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the last unit's order
      const lastUnit = await ctx.prisma.unit.findFirst({
        where: { courseId: input.courseId },
        orderBy: { order: "desc" },
      });

      const newOrder = (lastUnit?.order ?? -1) + 1;

      return ctx.prisma.unit.create({
        data: {
          courseId: input.courseId,
          order: newOrder,
          isVisible: input.data.isVisible,
          translations: {
            create: input.data.translations,
          },
        },
        include: {
          translations: true,
        },
      });
    }),

  updateUnit: protectedProcedure
    .input(
      z.object({
        unitId: z.string(),
        data: z.object({
          translations: z.array(
            z.object({
              language: z.enum(["ar", "en"]),
              unitTitle: z.string().min(1),
              unitDescription: z.string().min(1),
            })
          ),
          isVisible: z.boolean(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.unit.update({
        where: { id: input.unitId },
        data: {
          isVisible: input.data.isVisible,
          translations: {
            deleteMany: {},
            create: input.data.translations,
          },
        },
        include: {
          translations: true,
        },
      });
    }),

  deleteUnit: protectedProcedure
    .input(z.object({ unitId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.unit.delete({
        where: { id: input.unitId },
      });

      return { success: true };
    }),

  createLesson: protectedProcedure
    .input(
      z.object({
        unitId: z.string(),
        data: lessonSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the last lesson's order
      const lastLesson = await ctx.prisma.lesson.findFirst({
        where: { unitId: input.unitId },
        orderBy: { order: "desc" },
      });

      const newOrder = (lastLesson?.order ?? -1) + 1;

      return ctx.prisma.lesson.create({
        data: {
          unitId: input.unitId,
          order: newOrder,
          videoId: input.data.videoId,
          pdfUrl: input.data.pdfUrl,
          isVisible: input.data.isVisible,
          translations: {
            create: input.data.translations,
          },
        },
        include: {
          translations: true,
        },
      });
    }),

  updateLesson: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        data: lessonSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.lesson.update({
        where: { id: input.lessonId },
        data: {
          videoId: input.data.videoId,
          pdfUrl: input.data.pdfUrl,
          isVisible: input.data.isVisible,
          translations: {
            deleteMany: {},
            create: input.data.translations,
          },
        },
        include: {
          translations: true,
        },
      });
    }),

  deleteLesson: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the lesson with its video ID
      const lesson = await ctx.prisma.lesson.findUnique({
        where: { id: input.lessonId },
        select: { videoId: true },
      });

      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found",
        });
      }

      // Delete the video from Bunny storage if it exists
      if (lesson.videoId) {
        try {
          await fetch(
            `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos/${lesson.videoId}`,
            {
              method: "DELETE",
              headers: {
                Accept: "application/json",
                AccessKey: env.BUNNY_VIDEOS_LIBRARY_PASSWORD,
              },
            }
          );
        } catch (error) {
          // Log error but don't fail the operation
          console.error(`Failed to delete video ${lesson.videoId}:`, error);
        }
      }

      // Delete the lesson from the database
      await ctx.prisma.lesson.delete({
        where: { id: input.lessonId },
      });

      return { success: true };
    }),

  reorderUnits: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        unitIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update each unit's order in a transaction
      await ctx.prisma.$transaction(
        input.unitIds.map((unitId, index) =>
          ctx.prisma.unit.update({
            where: { id: unitId },
            data: { order: index },
          })
        )
      );

      return { success: true };
    }),

  reorderLessons: protectedProcedure
    .input(
      z.object({
        unitId: z.string(),
        lessonIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update each lesson's order in a transaction
      await ctx.prisma.$transaction(
        input.lessonIds.map((lessonId, index) =>
          ctx.prisma.lesson.update({
            where: { id: lessonId },
            data: { order: index },
          })
        )
      );

      return { success: true };
    }),

  getCourseByTitle: publicProcedure
    .input(z.object({ courseTitle: z.string() }))
    .query(async ({ ctx, input }) => {
      const decodedTitle = decodeURIComponent(input.courseTitle);

      console.log("Searching for course with title:", decodedTitle);

      const includeObject = {
        translations: true,
        category: {
          include: {
            translations: true,
          },
        },
        units: {
          include: {
            translations: true,
            lessons: {
              include: {
                translations: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
        Review: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                createdAt: true,
              },
            },
          },
          where: {
            user: {
              accountStatus: "ACTIVE",
              id: {
                not: undefined,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        enrolledStudents: {
          select: {
            id: true,
          },
        },
        instructors: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            translations: true,
          },
          where: {
            user: {
              accountStatus: "ACTIVE",
            },
          },
        },
        owner: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            translations: true,
          },
        },
      };

      // First try to find the course with exact title
      let course = await ctx.prisma.course.findFirst({
        where: {
          translations: {
            some: {
              courseTitle: {
                equals: decodedTitle,
                mode: "insensitive",
              },
            },
          },
        },
        include: includeObject,
      });

      // If not found, try with contains
      if (!course) {
        console.log(
          "Course not found with exact title, trying contains search"
        );
        course = await ctx.prisma.course.findFirst({
          where: {
            translations: {
              some: {
                courseTitle: {
                  contains: decodedTitle,
                  mode: "insensitive",
                },
              },
            },
          },
          include: includeObject,
        });
      }

      if (!course) {
        // Log all course titles for debugging
        const allCourses = await ctx.prisma.course.findMany({
          select: {
            translations: {
              select: {
                language: true,
                courseTitle: true,
              },
            },
          },
        });

        console.log(
          "All course titles in database:",
          JSON.stringify(
            allCourses.map((c) => c.translations),
            null,
            2
          )
        );

        console.log("Course not found with title:", decodedTitle);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      console.log("Found course:", course.id);

      // Calculate average rating
      const averageRating =
        course.Review.length > 0
          ? course.Review.reduce((acc, review) => acc + review.rating, 0) /
            course.Review.length
          : 0;

      // Calculate total lessons
      const totalLessons = course.units.reduce(
        (acc, unit) => acc + unit.lessons.length,
        0
      );

      // Format total duration in hours and minutes
      const formatTotalDuration = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        return `${hours}:${String(remainingMinutes).padStart(2, "0")}`;
      };

      // Clean up the data to match the expected format
      const cleanedCourse = {
        ...course,
        averageRating,
        totalLessons,
        totalDuration: formatTotalDuration(course.courseTotalMinutes),
        Review: course.Review.filter((review) => review.user?.id),
        instructors: course.instructors.filter(
          (instructor) => instructor.user?.id
        ),
        owner: course.owner?.user?.id ? course.owner : null,
      };

      return cleanedCourse;
    }),

  addReview: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is enrolled in the course
      const course = await ctx.prisma.course.findUnique({
        where: { id: input.courseId },
        select: {
          enrolledStudentIds: true,
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (!course.enrolledStudentIds.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be enrolled in the course to review it",
        });
      }

      // Check if user has already reviewed this course
      const existingReview = await ctx.prisma.review.findFirst({
        where: {
          userId: ctx.session.user.id,
          courseId: input.courseId,
        },
      });

      if (existingReview) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already reviewed this course",
        });
      }

      // Create the review
      const review = await ctx.prisma.review.create({
        data: {
          userId: ctx.session.user.id,
          courseId: input.courseId,
          rating: input.rating,
          comment: input.comment,
        },
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      return review;
    }),

  updateReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if review exists and belongs to the user
      const review = await ctx.prisma.review.findUnique({
        where: { id: input.reviewId },
        select: { userId: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      if (review.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own reviews",
        });
      }

      // Update the review
      const updatedReview = await ctx.prisma.review.update({
        where: { id: input.reviewId },
        data: {
          rating: input.rating,
          comment: input.comment,
        },
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      return updatedReview;
    }),

  deleteReview: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if review exists and belongs to the user
      const review = await ctx.prisma.review.findUnique({
        where: { id: input.reviewId },
        select: { userId: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      if (review.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own reviews",
        });
      }

      // Delete the review
      await ctx.prisma.review.delete({
        where: { id: input.reviewId },
      });

      return { success: true };
    }),

  // Update course progress when lesson is completed
  updateCourseProgress: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        lessonId: z.string(),
        completed: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { courseId, lessonId, completed } = input;
      const userId = ctx.session.user.id;

      // Check if user is enrolled
      const course = await ctx.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          units: {
            include: {
              lessons: {
                include: {
                  quiz: true,
                  videoCompletions: {
                    where: { userId },
                  },
                },
              },
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (!course.enrolledStudentIds.includes(userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not enrolled in this course",
        });
      }

      // Find the lesson and unit
      let targetLesson = null;
      let targetUnit = null;
      let targetUnitIndex = -1;
      let targetLessonIndex = -1;

      for (let unitIndex = 0; unitIndex < course.units.length; unitIndex++) {
        const unit = course.units[unitIndex];
        for (let lessonIndex = 0; lessonIndex < unit.lessons.length; lessonIndex++) {
          if (unit.lessons[lessonIndex].id === lessonId) {
            targetLesson = unit.lessons[lessonIndex];
            targetUnit = unit;
            targetUnitIndex = unitIndex;
            targetLessonIndex = lessonIndex;
            break;
          }
        }
        if (targetLesson) break;
      }

      if (!targetLesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found in this course",
        });
      }

      // Check if lesson is actually completed
      const videoCompletion = targetLesson.videoCompletions[0];
      const videoCompleted = videoCompletion?.completed || false;
      
      let quizCompleted = true; // Default if no quiz
      if (targetLesson.hasQuiz && targetLesson.quiz) {
        const quizSubmissions = await ctx.prisma.quizSubmission.findMany({
          where: {
            quizId: targetLesson.quiz.id,
            userId,
          },
          orderBy: { attempt: "desc" },
          take: 1,
        });
        quizCompleted = quizSubmissions.length > 0 && quizSubmissions[0].passed;
      }

      const isLessonActuallyCompleted = videoCompleted && quizCompleted;

      if (completed && !isLessonActuallyCompleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot mark lesson as completed: video or quiz not completed",
        });
      }

      // Get or create course progress
      let courseProgress = await ctx.prisma.courseProgress.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (!courseProgress) {
        courseProgress = await ctx.prisma.courseProgress.create({
          data: {
            userId,
            courseId,
            completedLessons: [],
            completedUnits: [],
            progress: 0,
          },
        });
      }

      // Update completed lessons
      let completedLessons = [...courseProgress.completedLessons];
      if (completed && !completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId);
      } else if (!completed && completedLessons.includes(lessonId)) {
        completedLessons = completedLessons.filter(id => id !== lessonId);
      }

      // Check if unit is completed (all lessons in unit are completed)
      let completedUnits = [...courseProgress.completedUnits];
      const unitLessonIds = targetUnit.lessons.map(l => l.id);
      const unitCompleted = unitLessonIds.every(id => completedLessons.includes(id));
      
      if (unitCompleted && !completedUnits.includes(targetUnit.id)) {
        completedUnits.push(targetUnit.id);
      } else if (!unitCompleted && completedUnits.includes(targetUnit.id)) {
        completedUnits = completedUnits.filter(id => id !== targetUnit.id);
      }

      // Calculate overall progress
      const totalLessons = course.units.reduce((total, unit) => total + unit.lessons.length, 0);
      const progressPercentage = totalLessons > 0 ? (completedLessons.length / totalLessons) * 100 : 0;
      const courseCompleted = progressPercentage >= 100;

      // Update current lesson and unit
      const currentLessonId = courseCompleted ? null : lessonId;
      const currentUnitId = courseCompleted ? null : targetUnit.id;

      // Update course progress
      const updatedProgress = await ctx.prisma.courseProgress.update({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        data: {
          completedLessons,
          completedUnits,
          progress: progressPercentage,
          completed: courseCompleted,
          currentLessonId,
          currentUnitId,
          lastAccessed: new Date(),
        },
      });

      return {
        progress: updatedProgress,
        lessonCompleted: completed,
        unitCompleted,
        courseCompleted,
        progressPercentage,
      };
    }),

  // Get user progress for all courses
  getUserProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const progress = await ctx.prisma.courseProgress.findMany({
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
          updatedAt: "desc",
        },
      });

      return progress;
    }),
});
