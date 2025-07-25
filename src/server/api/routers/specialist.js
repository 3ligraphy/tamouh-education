import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { adminProcedure, createTRPCRouter, publicProcedure } from "../trpc";

export const specialistRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const specialists = await ctx.prisma.specialist.findMany({
      include: {
        translations: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    return specialists.map((specialist) => ({
      id: specialist.id,
      name: {
        en:
          specialist.translations.find((t) => t.language === "en")
            ?.specialistName || "",
        ar:
          specialist.translations.find((t) => t.language === "ar")
            ?.specialistName || "",
      },
      title: {
        en:
          specialist.translations.find((t) => t.language === "en")
            ?.specialistTitle || "",
        ar:
          specialist.translations.find((t) => t.language === "ar")
            ?.specialistTitle || "",
      },
      image: specialist.image,
      order: specialist.order,
      createdAt: specialist.createdAt,
      updatedAt: specialist.updatedAt,
    }));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.object({
          en: z.string().min(1, "English name is required"),
          ar: z.string().min(1, "Arabic name is required"),
        }),
        title: z.object({
          en: z.string().min(1, "English title is required"),
          ar: z.string().min(1, "Arabic title is required"),
        }),
        image: z.string().min(1, "Profile image is required"),
        order: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!input.image) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Profile image is required",
          });
        }

        // Check if order number is already taken
        const existingSpecialist = await ctx.prisma.specialist.findFirst({
          where: {
            order: input.order,
          },
        });

        if (existingSpecialist) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Display order is already taken",
          });
        }

        const specialist = await ctx.prisma.specialist.create({
          data: {
            image: input.image,
            order: input.order,
            translations: {
              create: [
                {
                  language: "en",
                  specialistName: input.name.en,
                  specialistTitle: input.title.en,
                },
                {
                  language: "ar",
                  specialistName: input.name.ar,
                  specialistTitle: input.title.ar,
                },
              ],
            },
          },
          include: {
            translations: true,
          },
        });

        return {
          id: specialist.id,
          name: {
            en:
              specialist.translations.find((t) => t.language === "en")
                ?.specialistName || "",
            ar:
              specialist.translations.find((t) => t.language === "ar")
                ?.specialistName || "",
          },
          title: {
            en:
              specialist.translations.find((t) => t.language === "en")
                ?.specialistTitle || "",
            ar:
              specialist.translations.find((t) => t.language === "ar")
                ?.specialistTitle || "",
          },
          image: specialist.image,
          order: specialist.order,
          createdAt: specialist.createdAt,
          updatedAt: specialist.updatedAt,
        };
      } catch (error) {
        console.error("Error creating specialist:", error);
        throw error;
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.object({
          en: z.string().min(1, "English name is required"),
          ar: z.string().min(1, "Arabic name is required"),
        }),
        title: z.object({
          en: z.string().min(1, "English title is required"),
          ar: z.string().min(1, "Arabic title is required"),
        }),
        image: z.string().min(1, "Profile image is required"),
        order: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.image) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Profile image is required",
        });
      }

      // Check if order number is already taken by another specialist
      const existingSpecialist = await ctx.prisma.specialist.findFirst({
        where: {
          order: input.order,
          NOT: {
            id: input.id,
          },
        },
      });

      if (existingSpecialist) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Display order is already taken",
        });
      }

      const { id, name, title, ...data } = input;

      const specialist = await ctx.prisma.specialist.update({
        where: { id },
        data: {
          ...data,
          translations: {
            deleteMany: {},
            create: [
              {
                language: "en",
                specialistName: name.en,
                specialistTitle: title.en,
              },
              {
                language: "ar",
                specialistName: name.ar,
                specialistTitle: title.ar,
              },
            ],
          },
        },
        include: {
          translations: true,
        },
      });

      return {
        id: specialist.id,
        name: {
          en:
            specialist.translations.find((t) => t.language === "en")
              ?.specialistName || "",
          ar:
            specialist.translations.find((t) => t.language === "ar")
              ?.specialistName || "",
        },
        title: {
          en:
            specialist.translations.find((t) => t.language === "en")
              ?.specialistTitle || "",
          ar:
            specialist.translations.find((t) => t.language === "ar")
              ?.specialistTitle || "",
        },
        image: specialist.image,
        order: specialist.order,
        createdAt: specialist.createdAt,
        updatedAt: specialist.updatedAt,
      };
    }),

  delete: adminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      return await ctx.prisma.specialist.delete({
        where: { id },
      });
    }),
});
