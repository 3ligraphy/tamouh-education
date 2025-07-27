import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";

const userUpdateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "INSTRUCTOR", "USER"]).optional(),
  password: z.string().min(6).optional(),
  image: z.string().url().nullish().optional(),
  accountStatus: z.enum(["ACTIVE", "DISABLED"]).optional(),
  studentType: z.enum(["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"]).optional(),
  instructor: z
    .object({
      update: z.object({
        translations: z.object({
          deleteMany: z.object({}).optional(),
          create: z.array(
            z.object({
              language: z.enum(["ar", "en"]),
              instructorBio: z.string(),
              instructorName: z.string(),
              instructorJobTitle: z.string(),
            })
          ),
        }),
        address: z.string().optional(),
        permissions: z
          .object({
            upsert: z.object({
              create: z.object({
                canCreateCourses: z.boolean(),
              }),
              update: z.object({
                canCreateCourses: z.boolean(),
              }),
            }),
          })
          .optional(),
      }),
    })
    .optional(),
});

const userCreateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  role: z.enum(["ADMIN", "INSTRUCTOR", "USER"]),
  password: z.string().min(6),
  image: z.string().url().optional(),
  studentType: z.enum(["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"]).optional(),
  instructor: z
    .object({
      create: z.object({
        translations: z.object({
          create: z.array(
            z.object({
              language: z.enum(["ar", "en"]),
              instructorBio: z.string(),
              instructorName: z.string(),
              instructorJobTitle: z.string(),
            })
          ),
        }),
        address: z.string().optional(),
      }),
    })
    .optional(),
});

export const userRouter = createTRPCRouter({
  // Get all users (admin only)
  getAll: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      include: {
        wallet: true,
        instructor: {
          include: {
            translations: true,
            permissions: true,
          },
        },
        courseProgress: {
          include: {
            course: {
              include: {
                translations: true,
              },
            },
          },
        },
        enrolledCourses: {
          include: {
            translations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users;
  }),

  // Get a single user
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          wallet: true,
          instructor: {
            include: {
              translations: true,
              permissions: true,
            },
          },
          courseProgress: {
            include: {
              course: {
                include: {
                  translations: true,
                },
              },
            },
          },
          enrolledCourses: {
            include: {
              translations: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Create a new user (admin only)
  create: adminProcedure
    .input(userCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user with email or phone already exists
      const existingUser = await ctx.prisma.user.findFirst({
        where: {
          OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            existingUser.email === input.email.toLowerCase()
              ? "Email already in use"
              : "Phone number already in use",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Create user with instructor if specified
      const user = await ctx.prisma.user.create({
        data: {
          ...input,
          email: input.email.toLowerCase(),
          password: hashedPassword,
          accountStatus: "ACTIVE",
          instructor: input.instructor,
          wallet: {
            create: {
              balance: 0,
            },
          },
        },
        include: {
          wallet: true,
          instructor: {
            include: {
              translations: true,
              permissions: true,
            },
          },
        },
      });

      return user;
    }),

  // Update user (admin only)
  update: adminProcedure
    .input(userUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if role is being changed to INSTRUCTOR
      if (input.role === "INSTRUCTOR") {
        // Check if user already has an instructor record
        const existingInstructor = await ctx.prisma.instructor.findUnique({
          where: { userId: input.id },
        });

        if (!existingInstructor) {
          // Create instructor record if it doesn't exist
          await ctx.prisma.instructor.create({
            data: {
              userId: input.id,
              translations: {
                create: [
                  {
                    language: "ar",
                    instructorBio:
                      input.instructor?.update?.translations?.create?.[0]
                        ?.instructorBio || "",
                    instructorName:
                      input.instructor?.update?.translations?.create?.[0]
                        ?.instructorName || "",
                    instructorJobTitle:
                      input.instructor?.update?.translations?.create?.[0]
                        ?.instructorJobTitle || "",
                  },
                  {
                    language: "en",
                    instructorBio:
                      input.instructor?.update?.translations?.create?.[1]
                        ?.instructorBio || "",
                    instructorName:
                      input.instructor?.update?.translations?.create?.[1]
                        ?.instructorName || "",
                    instructorJobTitle:
                      input.instructor?.update?.translations?.create?.[1]
                        ?.instructorJobTitle || "",
                  },
                ],
              },
              address: input.instructor?.update?.address,
              permissions: input.instructor?.update?.permissions
                ? {
                    create: {
                      canCreateCourses:
                        input.instructor.update.permissions.upsert.create
                          .canCreateCourses,
                    },
                  }
                : undefined,
            },
          });
        }
      }

      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.email && { email: input.email.toLowerCase() }),
          ...(input.phone && { phone: input.phone }),
          ...(input.role && { role: input.role }),
          ...(input.password && {
            password: await bcrypt.hash(input.password, 12),
          }),
          ...(input.image && { image: input.image }),
          ...(input.accountStatus && { accountStatus: input.accountStatus }),
          ...(input.studentType && { studentType: input.studentType }),
          ...(input.instructor &&
            input.role === "INSTRUCTOR" && {
              instructor: {
                update: {
                  translations: input.instructor.update.translations,
                  address: input.instructor.update.address,
                  permissions: input.instructor.update.permissions,
                },
              },
            }),
        },
        include: {
          wallet: true,
          instructor: {
            include: {
              translations: true,
              permissions: true,
            },
          },
        },
      });

      return user;
    }),

  // Delete user (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if trying to delete self
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete your own account",
        });
      }

      // Check if user exists
      const userToDelete = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          instructor: true,
        },
      });

      if (!userToDelete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Delete user and all related data in a transaction
      try {
        await ctx.prisma.$transaction(async (prisma) => {
          // If user is an instructor, delete instructor-related data first
          if (userToDelete.instructor) {
            // Delete instructor translations
            await prisma.translation.deleteMany({
              where: {
                instructorId: userToDelete.instructor.id,
              },
            });

            // Delete instructor permissions
            await prisma.instructorPermission.deleteMany({
              where: {
                instructorId: userToDelete.instructor.id,
              },
            });

            // Delete course permissions
            await prisma.coursePermission.deleteMany({
              where: {
                instructorId: userToDelete.instructor.id,
              },
            });

            // Delete instructor
            await prisma.instructor.delete({
              where: {
                id: userToDelete.instructor.id,
              },
            });
          }

          // Delete user's course progress
          await prisma.courseProgress.deleteMany({
            where: {
              userId: input.id,
            },
          });

          // Delete user's reviews
          await prisma.review.deleteMany({
            where: {
              userId: input.id,
            },
          });

          // Delete user's favorites
          await prisma.userFavorite.deleteMany({
            where: {
              userId: input.id,
            },
          });

          // Delete user's wallet
          await prisma.wallet.deleteMany({
            where: {
              userId: input.id,
            },
          });

          // Finally delete the user
          return await prisma.user.delete({
            where: { id: input.id },
          });
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete user",
          cause: error,
        });
      }
    }),

  // Toggle user account status (admin only)
  toggleStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["ACTIVE", "DISABLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { accountStatus: input.status },
      });

      return user;
    }),

  // Get user's favorite courses
  getFavoriteCourses: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await ctx.prisma.userFavorite.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        course: {
          include: {
            translations: true,
            owner: {
              include: {
                translations: true,
                user: true,
              },
            },
            Review: true,
            enrolledStudents: true,
          },
        },
      },
    });

    return favorites.map((favorite) => favorite.course);
  }),

  // Toggle course favorite status
  toggleFavoriteCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingFavorite = await ctx.prisma.userFavorite.findUnique({
        where: {
          userId_courseId: {
            userId: ctx.session.user.id,
            courseId: input.courseId,
          },
        },
      });

      if (existingFavorite) {
        // Remove from favorites
        await ctx.prisma.userFavorite.delete({
          where: {
            userId_courseId: {
              userId: ctx.session.user.id,
              courseId: input.courseId,
            },
          },
        });

        return { isFavorited: false };
      } else {
        // Add to favorites
        await ctx.prisma.userFavorite.create({
          data: {
            userId: ctx.session.user.id,
            courseId: input.courseId,
          },
        });

        return { isFavorited: true };
      }
    }),

  // Check if a course is favorited by the user
  isCourseFavorited: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const favorite = await ctx.prisma.userFavorite.findUnique({
        where: {
          userId_courseId: {
            userId: ctx.session.user.id,
            courseId: input.courseId,
          },
        },
      });

      return { isFavorited: !!favorite };
    }),

  // Get current user
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        wallet: true,
        instructor: {
          include: {
            translations: true,
            permissions: true,
          },
        },
        courseProgress: {
          include: {
            course: {
              include: {
                translations: true,
              },
            },
          },
        },
        enrolledCourses: {
          include: {
            translations: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        avatar: z.any().optional(), // FormData for image upload
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6).optional(),
        confirmPassword: z.string().optional(),
        address: z.string().optional(),
        bio: z.string().optional(),
        jobTitle: z.string().optional(),
        studentType: z
          .enum(["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"])
          .optional(),
        instructor: z
          .object({
            update: z.object({
              translations: z.object({
                updateMany: z.array(
                  z.object({
                    where: z.object({
                      language: z.enum(["ar", "en"]),
                    }),
                    data: z.object({
                      instructorName: z.string(),
                    }),
                  })
                ),
              }),
            }),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx;
      const userId = session.user.id;

      // Prepare the user update data
      const updateData = {};

      // Handle basic fields
      if (input.name) updateData.name = input.name;
      if (input.email) updateData.email = input.email.toLowerCase();
      if (input.phone) updateData.phone = input.phone;
      if (input.studentType) updateData.studentType = input.studentType;

      // Handle password change if provided
      if (input.currentPassword && input.newPassword) {
        if (input.newPassword !== input.confirmPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New passwords do not match",
          });
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { password: true },
        });

        if (!user?.password) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Current password is required",
          });
        }

        const isValid = await bcrypt.compare(
          input.currentPassword,
          user.password
        );

        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Current password is incorrect",
          });
        }

        updateData.password = await bcrypt.hash(input.newPassword, 12);
      }

      // Handle avatar upload if provided
      if (input.avatar) {
        try {
          updateData.image = input.avatar;
        } catch (error) {
          console.error("Error updating avatar:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update profile image",
          });
        }
      }

      // Update instructor information if the user is an instructor
      if (session.user.role === "INSTRUCTOR") {
        if (input.instructor?.update?.translations?.updateMany) {
          await prisma.instructor.update({
            where: { userId },
            data: {
              translations: {
                updateMany: input.instructor.update.translations.updateMany,
              },
            },
          });
        } else if (input.address || input.bio || input.jobTitle) {
          await prisma.instructor.upsert({
            where: { userId },
            create: {
              userId,
              address: input.address,
              translations: {
                create: [
                  {
                    language: "ar",
                    instructorBio: input.bio,
                    instructorName: input.name || session.user.name,
                    instructorJobTitle: input.jobTitle,
                  },
                  {
                    language: "en",
                    instructorBio: input.bio,
                    instructorName: input.name || session.user.name,
                    instructorJobTitle: input.jobTitle,
                  },
                ],
              },
            },
            update: {
              address: input.address,
              translations: {
                deleteMany: {},
                create: [
                  {
                    language: "ar",
                    instructorBio: input.bio,
                    instructorName: input.name || session.user.name,
                    instructorJobTitle: input.jobTitle,
                  },
                  {
                    language: "en",
                    instructorBio: input.bio,
                    instructorName: input.name || session.user.name,
                    instructorJobTitle: input.jobTitle,
                  },
                ],
              },
            },
          });
        }
      }

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          instructor: {
            include: {
              translations: true,
            },
          },
        },
      });

      return updatedUser;
    }),

  deleteAccount: protectedProcedure
    .input(
      z.object({
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx;
      const userId = session.user.id;

      // First verify the password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          password: true,
          role: true,
          instructor: {
            select: { id: true },
          },
        },
      });

      if (!user?.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password verification required",
        });
      }

      const isValid = await bcrypt.compare(input.password, user.password);

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid password",
        });
      }

      // Delete all related data in a transaction
      try {
        await prisma.$transaction(async (tx) => {
          // Delete auth-related data
          await tx.session.deleteMany({
            where: { userId },
          });

          await tx.account.deleteMany({
            where: { userId },
          });

          // Delete course-related data
          await tx.courseProgress.deleteMany({
            where: { userId },
          });

          await tx.userFavorite.deleteMany({
            where: { userId },
          });

          await tx.review.deleteMany({
            where: { userId },
          });

          await tx.wallet.deleteMany({
            where: { userId },
          });

          // If user is an instructor, delete instructor-related data
          if (user.role === "INSTRUCTOR" && user.instructor) {
            // Delete instructor translations
            await tx.translation.deleteMany({
              where: {
                instructorId: user.instructor.id,
              },
            });

            // Delete instructor permissions
            await tx.instructorPermission.deleteMany({
              where: {
                instructorId: user.instructor.id,
              },
            });

            // Delete course permissions
            await tx.coursePermission.deleteMany({
              where: {
                instructorId: user.instructor.id,
              },
            });

            // Delete instructor
            await tx.instructor.delete({
              where: {
                id: user.instructor.id,
              },
            });
          }

          // Finally delete the user
          await tx.user.delete({
            where: { id: userId },
          });
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting account:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete account",
          cause: error,
        });
      }
    }),

  // Manually verify user (admin only - for testing)
  verifyUserEmail: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const user = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { emailVerified: new Date() },
      });

      return { success: true, user };
    }),
});
