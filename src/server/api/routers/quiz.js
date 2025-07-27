import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const questionSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "SINGLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"]),
  points: z.number().min(1).default(1),
  order: z.number(),
  translations: z.array(
    z.object({
      language: z.enum(["ar", "en"]),
      questionText: z.string().min(1, "Question text is required"),
      questionExplanation: z.string().optional(),
    })
  ),
  options: z.array(
    z.object({
      order: z.number(),
      isCorrect: z.boolean(),
      translations: z.array(
        z.object({
          language: z.enum(["ar", "en"]),
          optionText: z.string().min(1, "Option text is required"),
        })
      ),
    })
  ).optional(),
});

const quizSchema = z.object({
  isEnabled: z.boolean().default(true),
  timeLimit: z.number().nullable().optional(),
  passingScore: z.number().min(0).max(100).default(70),
  questions: z.array(questionSchema),
});

export const quizRouter = createTRPCRouter({
  // Create a quiz for a lesson
  create: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        quiz: quizSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if lesson exists and user has permission
      const lesson = await ctx.prisma.lesson.findUnique({
        where: { id: input.lessonId },
        include: {
          unit: {
            include: {
              course: {
                include: {
                  permissions: {
                    where: {
                      instructorId: ctx.session.user.instructor?.id,
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

      // Check if user has permission to add quiz
      const hasPermission = 
        lesson.unit.course.ownerId === ctx.session.user.instructor?.id ||
        lesson.unit.course.permissions.some(p => p.canUpdate) ||
        ctx.session.user.role === "ADMIN";

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to add quiz to this lesson",
        });
      }

      // Create quiz with questions and options
      const quiz = await ctx.prisma.quiz.create({
        data: {
          lessonId: input.lessonId,
          isEnabled: input.quiz.isEnabled,
          timeLimit: input.quiz.timeLimit,
          passingScore: input.quiz.passingScore,
          questions: {
            create: input.quiz.questions.map((question) => ({
              type: question.type,
              points: question.points,
              order: question.order,
              translations: {
                create: question.translations,
              },
              options: question.options ? {
                create: question.options.map((option) => ({
                  order: option.order,
                  isCorrect: option.isCorrect,
                  translations: {
                    create: option.translations,
                  },
                })),
              } : undefined,
            })),
          },
        },
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
      });

      // Update lesson to mark it has a quiz
      await ctx.prisma.lesson.update({
        where: { id: input.lessonId },
        data: { hasQuiz: true },
      });

      return quiz;
    }),

  // Get quiz by lesson ID
  getByLessonId: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const quiz = await ctx.prisma.quiz.findUnique({
        where: { lessonId: input.lessonId },
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
          submissions: {
            where: { userId: ctx.session.user.id },
            orderBy: { attempt: "desc" },
            take: 1,
          },
        },
      });

      return quiz;
    }),

  // Submit quiz answers
  submit: protectedProcedure
    .input(
      z.object({
        quizId: z.string(),
        answers: z.array(
          z.object({
            questionId: z.string(),
            selectedOptions: z.array(z.string()).optional(),
            textAnswer: z.string().optional(),
          })
        ),
        timeTaken: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get quiz with questions and options
      const quiz = await ctx.prisma.quiz.findUnique({
        where: { id: input.quizId },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
          lesson: {
            include: {
              unit: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
      });

      if (!quiz) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quiz not found",
        });
      }

      // Check if user is enrolled in the course
      const isEnrolled = quiz.lesson.unit.course.enrolledStudentIds.includes(ctx.session.user.id);
      if (!isEnrolled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be enrolled in the course to take this quiz",
        });
      }

      // Check video completion
      const videoCompletion = await ctx.prisma.videoCompletion.findUnique({
        where: {
          userId_lessonId: {
            userId: ctx.session.user.id,
            lessonId: quiz.lessonId,
          },
        },
      });

      if (!videoCompletion?.completed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must complete watching the video before taking the quiz",
        });
      }

      // Get previous attempts count
      const previousAttempts = await ctx.prisma.quizSubmission.count({
        where: {
          quizId: input.quizId,
          userId: ctx.session.user.id,
        },
      });

      const attempt = previousAttempts + 1;

      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;
      const processedAnswers = [];

      for (const question of quiz.questions) {
        totalPoints += question.points;
        const userAnswer = input.answers.find(a => a.questionId === question.id);
        
        if (!userAnswer) {
          processedAnswers.push({
            questionId: question.id,
            selectedOptions: [],
            textAnswer: null,
            isCorrect: false,
            points: 0,
          });
          continue;
        }

        let isCorrect = false;
        let points = 0;

        if (question.type === "MULTIPLE_CHOICE" || question.type === "SINGLE_CHOICE") {
          const correctOptions = question.options.filter(o => o.isCorrect).map(o => o.id);
          const selectedOptions = userAnswer.selectedOptions || [];
          
          if (question.type === "SINGLE_CHOICE") {
            isCorrect = selectedOptions.length === 1 && correctOptions.includes(selectedOptions[0]);
          } else {
            isCorrect = correctOptions.length === selectedOptions.length &&
                       correctOptions.every(id => selectedOptions.includes(id));
          }
        } else if (question.type === "TRUE_FALSE") {
          const correctOption = question.options.find(o => o.isCorrect);
          const selectedOptions = userAnswer.selectedOptions || [];
          isCorrect = selectedOptions.length === 1 && selectedOptions[0] === correctOption?.id;
        }

        if (isCorrect) {
          points = question.points;
          earnedPoints += points;
        }

        processedAnswers.push({
          questionId: question.id,
          selectedOptions: userAnswer.selectedOptions || [],
          textAnswer: userAnswer.textAnswer,
          isCorrect,
          points,
        });
      }

      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      const passed = score >= quiz.passingScore;

      // Create submission
      const submission = await ctx.prisma.quizSubmission.create({
        data: {
          quizId: input.quizId,
          userId: ctx.session.user.id,
          score,
          passed,
          timeTaken: input.timeTaken,
          attempt,
          answers: {
            create: processedAnswers,
          },
        },
        include: {
          answers: true,
        },
      });

      return {
        submission,
        score,
        passed,
        totalQuestions: quiz.questions.length,
        correctAnswers: processedAnswers.filter(a => a.isCorrect).length,
      };
    }),

  // Get quiz results/submissions for a user
  getSubmissions: protectedProcedure
    .input(z.object({ quizId: z.string() }))
    .query(async ({ ctx, input }) => {
      const submissions = await ctx.prisma.quizSubmission.findMany({
        where: {
          quizId: input.quizId,
          userId: ctx.session.user.id,
        },
        include: {
          answers: {
            include: {
              submission: true,
            },
          },
        },
        orderBy: { attempt: "desc" },
      });

      return submissions;
    }),

  // Update video completion status
  updateVideoCompletion: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        watchTime: z.number(),
        totalTime: z.number().optional(),
        lastPosition: z.number(),
        completed: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const completionRate = input.totalTime ? (input.watchTime / input.totalTime) * 100 : 0;
      const isCompleted = input.completed ?? completionRate >= 80; // Consider 80% watched as completed

      const videoCompletion = await ctx.prisma.videoCompletion.upsert({
        where: {
          userId_lessonId: {
            userId: ctx.session.user.id,
            lessonId: input.lessonId,
          },
        },
        update: {
          watchTime: input.watchTime,
          totalTime: input.totalTime,
          completionRate,
          lastPosition: input.lastPosition,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
        create: {
          userId: ctx.session.user.id,
          lessonId: input.lessonId,
          watchTime: input.watchTime,
          totalTime: input.totalTime,
          completionRate,
          lastPosition: input.lastPosition,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

      return videoCompletion;
    }),

  // Get video completion status
  getVideoCompletion: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const completion = await ctx.prisma.videoCompletion.findUnique({
        where: {
          userId_lessonId: {
            userId: ctx.session.user.id,
            lessonId: input.lessonId,
          },
        },
      });

      return completion;
    }),

  // Update quiz
  update: protectedProcedure
    .input(
      z.object({
        quizId: z.string(),
        quiz: quizSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permissions (similar to create)
      const existingQuiz = await ctx.prisma.quiz.findUnique({
        where: { id: input.quizId },
        include: {
          lesson: {
            include: {
              unit: {
                include: {
                  course: {
                    include: {
                      permissions: {
                        where: {
                          instructorId: ctx.session.user.instructor?.id,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!existingQuiz) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quiz not found",
        });
      }

      const hasPermission = 
        existingQuiz.lesson.unit.course.ownerId === ctx.session.user.instructor?.id ||
        existingQuiz.lesson.unit.course.permissions.some(p => p.canUpdate) ||
        ctx.session.user.role === "ADMIN";

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this quiz",
        });
      }

      // Delete existing questions and recreate
      await ctx.prisma.quizQuestion.deleteMany({
        where: { quizId: input.quizId },
      });

      const updatedQuiz = await ctx.prisma.quiz.update({
        where: { id: input.quizId },
        data: {
          isEnabled: input.quiz.isEnabled,
          timeLimit: input.quiz.timeLimit,
          passingScore: input.quiz.passingScore,
          questions: {
            create: input.quiz.questions.map((question) => ({
              type: question.type,
              points: question.points,
              order: question.order,
              translations: {
                create: question.translations,
              },
              options: question.options ? {
                create: question.options.map((option) => ({
                  order: option.order,
                  isCorrect: option.isCorrect,
                  translations: {
                    create: option.translations,
                  },
                })),
              } : undefined,
            })),
          },
        },
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
      });

      return updatedQuiz;
    }),

  // Delete quiz
  delete: protectedProcedure
    .input(z.object({ quizId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.prisma.quiz.findUnique({
        where: { id: input.quizId },
        include: {
          lesson: {
            include: {
              unit: {
                include: {
                  course: {
                    include: {
                      permissions: {
                        where: {
                          instructorId: ctx.session.user.instructor?.id,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!quiz) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quiz not found",
        });
      }

      const hasPermission = 
        quiz.lesson.unit.course.ownerId === ctx.session.user.instructor?.id ||
        quiz.lesson.unit.course.permissions.some(p => p.canDelete) ||
        ctx.session.user.role === "ADMIN";

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this quiz",
        });
      }

      await ctx.prisma.quiz.delete({
        where: { id: input.quizId },
      });

      // Update lesson to mark it doesn't have a quiz
      await ctx.prisma.lesson.update({
        where: { id: quiz.lessonId },
        data: { hasQuiz: false },
      });

      return { success: true };
    }),
}); 