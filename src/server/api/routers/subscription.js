import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const subscriptionRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await ctx.prisma.subscription.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return subscriptions;
  }),

  create: protectedProcedure
    .input(
      z.object({
        planType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
        invoiceImage: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate end date based on plan type
      const startDate = new Date();
      let endDate = new Date(startDate);

      switch (input.planType) {
        case "MONTHLY":
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case "YEARLY":
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      const subscription = await ctx.prisma.subscription.create({
        data: {
          userId: ctx.session.user.id,
          planType: input.planType,
          status: "PENDING",
          startDate,
          endDate,
          invoiceImage: input.invoiceImage,
          notes: input.notes,
        },
      });

      // Update user subscription status
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { subscriptionStatus: "PENDING" },
      });

      return subscription;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["COMPLETED", "PENDING", "FAILED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.prisma.subscription.update({
        where: { id: input.id },
        data: {
          status: input.status,
        },
      });

      return subscription;
    }),
});
