import { z } from "zod";

import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "@/server/api/trpc";

const translationSchema = z.object({
  language: z.enum(["en", "ar"]),
  categoryName: z.string().min(1),
});

const categoryInputSchema = z.object({
  translations: z.array(translationSchema),
  image: z.string().default("/logo.svg"),
});

export const categoryRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.category.findMany({
      include: {
        translations: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.category.findUnique({
        where: { id: input.id },
        include: {
          translations: true,
        },
      });
    }),

  create: adminProcedure
    .input(categoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.category.create({
        data: {
          image: input.image,
          translations: {
            create: input.translations,
          },
        },
        include: {
          translations: true,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        ...categoryInputSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Delete existing translations
      await ctx.prisma.translation.deleteMany({
        where: {
          categoryId: input.id,
        },
      });

      // Update category with new translations
      return await ctx.prisma.category.update({
        where: { id: input.id },
        data: {
          image: input.image,
          translations: {
            create: input.translations,
          },
        },
        include: {
          translations: true,
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete associated translations first
      await ctx.prisma.translation.deleteMany({
        where: {
          categoryId: input.id,
        },
      });

      // Then delete the category
      return await ctx.prisma.category.delete({
        where: { id: input.id },
      });
    }),
});
