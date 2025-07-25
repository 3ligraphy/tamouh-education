import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";

export const instructorRouter = createTRPCRouter({
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session?.user?.role !== "INSTRUCTOR") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only instructors can access this endpoint",
      });
    }

    const instructor = await ctx.prisma.instructor.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        permissions: true,
        coursePermissions: true,
        ownedCourses: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!instructor) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instructor profile not found",
      });
    }

    return {
      id: instructor.id,
      permissions: instructor.permissions,
      coursePermissions: instructor.coursePermissions,
      ownedCourseIds: instructor.ownedCourses.map((course) => course.id),
    };
  }),

  getMyCourses: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session?.user?.role !== "INSTRUCTOR") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only instructors can access this endpoint",
      });
    }

    const instructor = await ctx.prisma.instructor.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        ownedCourses: {
          include: {
            translations: true,
            Review: true,
            courseProgress: true,
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
            enrolledStudents: {
              select: {
                id: true,
              },
            },
          },
        },
        courses: {
          include: {
            translations: true,
            Review: true,
            courseProgress: true,
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
            enrolledStudents: {
              select: {
                id: true,
              },
            },
          },
        },
        coursePermissions: true,
      },
    });

    if (!instructor) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instructor profile not found",
      });
    }

    // Combine owned courses and courses they were added to
    const allCourses = [...instructor.ownedCourses, ...instructor.courses];

    // Remove duplicates based on course ID
    const uniqueCourses = Array.from(
      new Map(allCourses.map((course) => [course.id, course])).values()
    );

    return uniqueCourses.map((course) => ({
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
      courseBrief: {
        en:
          course.translations.find((t) => t.language === "en")?.courseBrief ||
          "",
        ar:
          course.translations.find((t) => t.language === "ar")?.courseBrief ||
          "",
      },
      learningPoints: {
        en:
          course.translations.find((t) => t.language === "en")
            ?.learningPoints || [],
        ar:
          course.translations.find((t) => t.language === "ar")
            ?.learningPoints || [],
      },
      targetAudience: {
        en:
          course.translations.find((t) => t.language === "en")
            ?.targetAudience || [],
        ar:
          course.translations.find((t) => t.language === "ar")
            ?.targetAudience || [],
      },
      requirements: {
        en:
          course.translations.find((t) => t.language === "en")?.requirements ||
          [],
        ar:
          course.translations.find((t) => t.language === "ar")?.requirements ||
          [],
      },
      courseLanguage: course.courseLanguage,
      courseLevel: course.courseLevel,
      courseType: course.courseType,
      courseTimezone: course.courseTimezone,
      courseStart: course.courseStart,
      courseEnd: course.courseEnd,
      isDraft: course.isDraft,
      isShown: course.isShown,
      thumbnailUrl: course.thumbnailUrl,
      overviewVideoId: course.overviewVideoId,
      price: course.price,
      courseTotalMinutes: course.courseTotalMinutes,
      rating: Number(
        (
          course.Review.reduce((acc, review) => acc + review.rating, 0) /
          (course.Review.length || 1)
        ).toFixed(1)
      ),
      students: course.enrolledStudentIds?.length || 0,
      image: course.thumbnailUrl || "",
      isOwner: instructor.ownedCourses.some((c) => c.id === course.id),
      permissions: instructor.coursePermissions.find(
        (p) => p.courseId === course.id
      ),
      category: course.category,
      updatedAt: course.updatedAt,
      updatedBy: course.updatedBy?.name,
    }));
  }),

  // Get all instructors (admin only)
  getAllInstructors: adminProcedure.query(async ({ ctx }) => {
    if (ctx.session?.user?.role !== "ADMIN") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only admins can access this endpoint",
      });
    }

    const instructors = await ctx.prisma.instructor.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            accountStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        translations: true,
        permissions: true,
        coursePermissions: {
          include: {
            course: {
              select: {
                id: true,
                translations: {
                  select: {
                    language: true,
                    courseTitle: true,
                  },
                },
              },
            },
          },
        },
        ownedCourses: {
          select: {
            id: true,
            translations: {
              select: {
                language: true,
                courseTitle: true,
              },
            },
            enrolledStudents: {
              select: {
                id: true,
              },
            },
            Review: {
              select: {
                rating: true,
              },
            },
          },
        },
        courses: {
          select: {
            id: true,
            translations: {
              select: {
                language: true,
                courseTitle: true,
              },
            },
            enrolledStudents: {
              select: {
                id: true,
              },
            },
            Review: {
              select: {
                rating: true,
              },
            },
          },
        },
        _count: {
          select: {
            ownedCourses: true,
            courses: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return instructors.map((instructor) => ({
      id: instructor.id,
      user: instructor.user,
      translations: instructor.translations,
      address: instructor.address,
      permissions: instructor.permissions,
      coursePermissions: instructor.coursePermissions.map((permission) => ({
        ...permission,
        courseTitle: {
          en:
            permission.course.translations.find((t) => t.language === "en")
              ?.courseTitle || "",
          ar:
            permission.course.translations.find((t) => t.language === "ar")
              ?.courseTitle || "",
        },
      })),
      courses: {
        owned: instructor.ownedCourses.map((course) => ({
          id: course.id,
          title: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseTitle || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseTitle || "",
          },
          studentsCount: course.enrolledStudents.length,
          rating: Number(
            (
              course.Review.reduce((acc, review) => acc + review.rating, 0) /
              (course.Review.length || 1)
            ).toFixed(1)
          ),
        })),
        teaching: instructor.courses.map((course) => ({
          id: course.id,
          title: {
            en:
              course.translations.find((t) => t.language === "en")
                ?.courseTitle || "",
            ar:
              course.translations.find((t) => t.language === "ar")
                ?.courseTitle || "",
          },
          studentsCount: course.enrolledStudents.length,
          rating: Number(
            (
              course.Review.reduce((acc, review) => acc + review.rating, 0) /
              (course.Review.length || 1)
            ).toFixed(1)
          ),
        })),
      },
      stats: {
        totalOwnedCourses: instructor._count.ownedCourses,
        totalTeachingCourses: instructor._count.courses,
        totalStudents: [
          ...instructor.ownedCourses,
          ...instructor.courses,
        ].reduce((acc, course) => acc + course.enrolledStudents.length, 0),
        averageRating: Number(
          (
            [...instructor.ownedCourses, ...instructor.courses].reduce(
              (acc, course) => {
                const courseRating =
                  course.Review.reduce(
                    (sum, review) => sum + review.rating,
                    0
                  ) / (course.Review.length || 1);

                return acc + courseRating;
              },
              0
            ) /
            (instructor._count.ownedCourses + instructor._count.courses || 1)
          ).toFixed(1)
        ),
      },
      createdAt: instructor.createdAt,
      updatedAt: instructor.updatedAt,
    }));
  }),
});
