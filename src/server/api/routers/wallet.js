import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Parser } from "json2csv";

import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";

export const walletRouter = createTRPCRouter({
  // Get user's wallet
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      return ctx.prisma.wallet.create({
        data: {
          userId: ctx.session.user.id,
          balance: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    return wallet;
  }),

  // Request credit purchase
  requestCredit: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        invoiceUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wallet not found",
        });
      }

      return ctx.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: input.amount,
          type: "CREDIT_PURCHASE",
          status: "PENDING",
          invoiceUrl: input.invoiceUrl,
        },
      });
    }),

  // Get all pending credit requests (admin only)
  getPendingCreditRequests: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const [total, items] = await Promise.all([
        ctx.prisma.walletTransaction.count({
          where: {
            type: "CREDIT_PURCHASE",
            status: "PENDING",
          },
        }),
        ctx.prisma.walletTransaction.findMany({
          where: {
            type: "CREDIT_PURCHASE",
            status: "PENDING",
          },
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.limit,
        }),
      ]);

      return {
        items,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Approve credit request (admin only)
  approveCredit: adminProcedure
    .input(
      z.object({
        transactionId: z.string(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.walletTransaction.findUnique({
        where: { id: input.transactionId },
        include: { wallet: true },
      });

      if (!transaction || transaction.status !== "PENDING") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found or already processed",
        });
      }

      // Update transaction and wallet balance in a transaction
      return ctx.prisma.$transaction([
        ctx.prisma.walletTransaction.update({
          where: { id: input.transactionId },
          data: {
            status: "COMPLETED",
            amount: input.amount, // Allow admin to adjust amount
          },
        }),
        ctx.prisma.wallet.update({
          where: { id: transaction.walletId },
          data: {
            balance: {
              increment: input.amount,
            },
          },
        }),
      ]);
    }),

  // Reject credit request (admin only)
  rejectCredit: adminProcedure
    .input(
      z.object({
        transactionId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.walletTransaction.findUnique({
        where: { id: input.transactionId },
      });

      if (!transaction || transaction.status !== "PENDING") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found or already processed",
        });
      }

      return ctx.prisma.walletTransaction.update({
        where: { id: input.transactionId },
        data: {
          status: "FAILED",
          notes: input.reason,
        },
      });
    }),

  // Get all wallet transactions (admin only)
  getAllTransactions: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).optional().default(10),
        type: z
          .enum([
            "CREDIT_PURCHASE",
            "COURSE_PURCHASE",
            "REFUND",
            "CREDIT_ADJUSTMENT",
          ])
          .optional(),
        status: z
          .enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"])
          .optional(),
        userId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where = {
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
        ...(input.userId && { wallet: { userId: input.userId } }),
        ...(input.startDate && {
          createdAt: {
            gte: input.startDate,
            ...(input.endDate && { lte: input.endDate }),
          },
        }),
      };

      const [total, items] = await Promise.all([
        ctx.prisma.walletTransaction.count({ where }),
        ctx.prisma.walletTransaction.findMany({
          where,
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            courseTransaction: {
              include: {
                course: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.limit,
        }),
      ]);

      return {
        items,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Make manual credit adjustment (admin only)
  adjustCredit: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findUnique({
        where: { userId: input.userId },
      });

      if (!wallet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wallet not found",
        });
      }

      // Check if adjustment would result in negative balance
      if (wallet.balance + input.amount < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient wallet balance for deduction",
        });
      }

      return ctx.prisma.$transaction([
        ctx.prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: input.amount, // Store the actual signed amount
            type: "CREDIT_ADJUSTMENT",
            status: "COMPLETED",
            notes: input.reason,
          },
        }),
        ctx.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: input.amount,
            },
          },
        }),
      ]);
    }),

  // Get transaction statistics (admin only)
  getTransactionStats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const dateFilter = input.startDate
        ? {
            createdAt: {
              gte: input.startDate,
              ...(input.endDate && { lte: input.endDate }),
            },
          }
        : {};

      const [
        creditPurchases,
        coursePurchases,
        refunds,
        adjustments,
        pendingRequests,
        averageAmount,
        topUsers,
      ] = await Promise.all([
        // Credit purchases
        ctx.prisma.walletTransaction.aggregate({
          where: {
            type: "CREDIT_PURCHASE",
            status: "COMPLETED",
            ...dateFilter,
          },
          _sum: { amount: true },
          _count: true,
        }),

        // Course purchases
        ctx.prisma.walletTransaction.aggregate({
          where: {
            type: "COURSE_PURCHASE",
            status: "COMPLETED",
            ...dateFilter,
          },
          _sum: { amount: true },
          _count: true,
        }),

        // Refunds
        ctx.prisma.walletTransaction.aggregate({
          where: {
            type: "REFUND",
            status: "COMPLETED",
            ...dateFilter,
          },
          _sum: { amount: true },
          _count: true,
        }),

        // Adjustments
        ctx.prisma.walletTransaction.aggregate({
          where: {
            type: "CREDIT_ADJUSTMENT",
            status: "COMPLETED",
            ...dateFilter,
          },
          _sum: { amount: true },
          _count: true,
        }),

        // Pending requests count
        ctx.prisma.walletTransaction.count({
          where: {
            status: "PENDING",
            ...dateFilter,
          },
        }),

        // Average transaction amount
        ctx.prisma.walletTransaction.aggregate({
          where: {
            status: "COMPLETED",
            ...dateFilter,
          },
          _avg: { amount: true },
        }),

        // Top users by transaction volume
        ctx.prisma.wallet.findMany({
          take: 5,
          where: {
            transactions: {
              some: {
                status: "COMPLETED",
                ...dateFilter,
              },
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                transactions: {
                  where: {
                    status: "COMPLETED",
                    ...dateFilter,
                  },
                },
              },
            },
            transactions: {
              where: {
                status: "COMPLETED",
                ...dateFilter,
              },
              select: {
                amount: true,
              },
            },
          },
          orderBy: {
            transactions: {
              _count: "desc",
            },
          },
        }),
      ]);

      return {
        creditPurchases: {
          total: creditPurchases._sum.amount || 0,
          count: creditPurchases._count,
        },
        coursePurchases: {
          total: Math.abs(coursePurchases._sum.amount || 0),
          count: coursePurchases._count,
        },
        refunds: {
          total: refunds._sum.amount || 0,
          count: refunds._count,
        },
        adjustments: {
          total: adjustments._sum.amount || 0,
          count: adjustments._count,
        },
        pendingRequests,
        averageAmount: averageAmount._avg.amount || 0,
        topUsers: topUsers.map((wallet) => ({
          user: wallet.user,
          transactionCount: wallet._count.transactions,
          totalAmount: wallet.transactions.reduce(
            (sum, t) => sum + t.amount,
            0
          ),
        })),
      };
    }),

  // Export transactions to CSV (admin only)
  exportTransactions: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        type: z
          .enum([
            "CREDIT_PURCHASE",
            "COURSE_PURCHASE",
            "REFUND",
            "CREDIT_ADJUSTMENT",
          ])
          .optional(),
        status: z
          .enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const where = {
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
        ...(input.startDate && {
          createdAt: {
            gte: input.startDate,
            ...(input.endDate && { lte: input.endDate }),
          },
        }),
      };

      const transactions = await ctx.prisma.walletTransaction.findMany({
        where,
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
          courseTransaction: {
            include: {
              course: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const fields = [
        "Transaction ID",
        "User",
        "Type",
        "Amount",
        "Status",
        "Date",
        "Course",
        "Notes",
      ];

      const data = transactions.map((t) => ({
        "Transaction ID": t.id,
        User: t.wallet.user.name || t.wallet.user.email,
        Type: t.type,
        Amount: t.amount,
        Status: t.status,
        Date: t.createdAt.toISOString(),
        Course:
          t.courseTransaction?.course.translations.find(
            (tr) => tr.language === "en"
          )?.courseTitle || "",
        Notes: t.notes || "",
      }));

      const parser = new Parser({ fields });

      return parser.parse(data);
    }),

  // Bulk approve/reject credit requests (admin only)
  bulkProcessRequests: adminProcedure
    .input(
      z.object({
        transactionIds: z.array(
          z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format")
        ),
        action: z.enum(["APPROVE", "REJECT"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.walletTransaction.findMany({
        where: {
          id: { in: input.transactionIds },
          status: "PENDING",
          type: "CREDIT_PURCHASE",
        },
        include: {
          wallet: true,
        },
      });

      if (transactions.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No valid transactions found",
        });
      }

      if (input.action === "APPROVE") {
        return ctx.prisma.$transaction(
          transactions.flatMap((transaction) => [
            ctx.prisma.walletTransaction.update({
              where: { id: transaction.id },
              data: {
                status: "COMPLETED",
              },
            }),
            ctx.prisma.wallet.update({
              where: { id: transaction.walletId },
              data: {
                balance: {
                  increment: transaction.amount,
                },
              },
            }),
          ])
        );
      } else {
        return ctx.prisma.walletTransaction.updateMany({
          where: {
            id: { in: input.transactionIds },
            status: "PENDING",
          },
          data: {
            status: "FAILED",
            notes: input.reason,
          },
        });
      }
    }),

  // Search users for credit adjustment
  searchUsers: adminProcedure
    .input(
      z.object({
        query: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          wallet: {
            select: {
              balance: true,
            },
          },
        },
        take: 5,
      });
    }),
});
