import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const studentRouter = createTRPCRouter({
  // Get enrolled courses with progress
  getEnrolledCourses: protectedProcedure.query(async ({ ctx }) => {
    const enrolledCourses = await ctx.prisma.course.findMany({
      where: {
        enrolledStudentIds: {
          has: ctx.session.user.id,
        },
      },
      include: {
        translations: true,
        courseProgress: {
          where: {
            userId: ctx.session.user.id,
          },
        },
        owner: {
          include: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
            translations: true,
          },
        },
        Review: {
          include: {
            user: true,
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
    });

    return enrolledCourses.map((course) => ({
      id: course.id,
      translations: course.translations,
      image: course.thumbnailUrl || "https://placehold.co/600x400",
      thumbnailUrl: course.thumbnailUrl || "https://placehold.co/600x400",
      courseProgress: course.courseProgress,
      rating: Number(
        (
          course.Review.reduce((acc, review) => acc + review.rating, 0) /
          (course.Review.length || 1)
        ).toFixed(1)
      ),
      students: course.enrolledStudents.length,
      owner: course.owner,
      updatedAt: course.updatedAt,
      updatedBy: course.updatedBy?.name,
    }));
  }),

  // Get favorite courses
  getFavoriteCourses: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await ctx.prisma.userFavorite.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        course: {
          include: {
            translations: true,
            courseProgress: {
              where: {
                userId: ctx.session.user.id,
              },
            },
            owner: {
              include: {
                user: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
                translations: true,
              },
            },
            Review: {
              include: {
                user: true,
              },
            },
            enrolledStudents: {
              select: {
                id: true,
              },
            },
            updatedBy: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return favorites.map((f) => ({
      id: f.course.id,
      translations: f.course.translations,
      image: f.course.thumbnailUrl || "https://placehold.co/600x400",
      thumbnailUrl: f.course.thumbnailUrl || "https://placehold.co/600x400",
      courseProgress: f.course.courseProgress[0],
      rating: Number(
        (
          f.course.Review.reduce((acc, review) => acc + review.rating, 0) /
          (f.course.Review.length || 1)
        ).toFixed(1)
      ),
      students: f.course.enrolledStudents.length,
      owner: f.course.owner,
      updatedAt: f.course.updatedAt,
      updatedBy: f.course.updatedBy?.name,
    }));
  }),

  // Get course progress
  getCourseProgress: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const progress = await ctx.prisma.courseProgress.findUnique({
        where: {
          userId_courseId: {
            userId: ctx.session.user.id,
            courseId: input.courseId,
          },
        },
        include: {
          currentUnit: {
            include: {
              translations: true,
            },
          },
          currentLesson: {
            include: {
              translations: true,
            },
          },
        },
      });

      if (!progress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course progress not found",
        });
      }

      return progress;
    }),
});
