import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const paginationInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export const transactionsRouter = createTRPCRouter({
  getWalletTransactions: protectedProcedure
    .input(
      paginationInputSchema.extend({
        status: z.enum(["ALL", "PENDING", "FAILED", "SUCCESS"]).default("ALL"),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const [transactions, total] = await ctx.prisma.$transaction([
        ctx.prisma.walletTransaction.findMany({
          skip,
          take: input.limit,
          where: {
            courseTransaction: null, // Exclude course-related transactions
            ...(input.status !== "ALL" && { status: input.status }),
          },
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        ctx.prisma.walletTransaction.count({
          where: {
            courseTransaction: null,
            ...(input.status !== "ALL" && { status: input.status }),
          },
        }),
      ]);

      return {
        items: transactions,
        total,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  getCourseTransactions: protectedProcedure
    .input(
      paginationInputSchema.extend({
        status: z.enum(["ALL", "PENDING", "FAILED", "SUCCESS"]).default("ALL"),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const [transactions, total] = await ctx.prisma.$transaction([
        ctx.prisma.courseTransaction.findMany({
          skip,
          take: input.limit,
          where: {
            ...(input.status !== "ALL" && { status: input.status }),
          },
          include: {
            course: {
              include: {
                translations: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            walletTransaction: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        ctx.prisma.courseTransaction.count({
          where: {
            ...(input.status !== "ALL" && { status: input.status }),
          },
        }),
      ]);

      return {
        items: transactions,
        total,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
});
