import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";

const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  studentType: z.enum(["UNIVERSITY_STUDENT", "SCHOOL_STUDENT"]),
  phone: z.string().min(1, "Phone number is required"),
  visitorId: z.string().min(1, "Fingerprint visitor ID is required"),
  deviceInfo: z
    .object({
      deviceName: z.string().optional(),
      deviceLocation: z.string().optional(),
    })
    .optional(),
});

const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  visitorId: z.string().min(1, "Fingerprint visitor ID is required"),
  deviceInfo: z
    .object({
      deviceName: z.string().optional(),
      deviceLocation: z.string().optional(),
    })
    .optional(),
});

export const authRouter = createTRPCRouter({
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        fullName,
        email,
        password,
        studentType,
        phone,
        visitorId,
        deviceInfo,
      } = input;

      // Check if user already exists
      const existingUser = await ctx.prisma.user.findFirst({
        where: {
          OR: [{ email: email.toLowerCase() }, { phone }],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            existingUser.email === email.toLowerCase()
              ? "User with this email already exists"
              : "User with this phone number already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user with active session
      const user = await ctx.prisma.user.create({
        data: {
          name: fullName,
          email: email.toLowerCase(),
          password: hashedPassword,
          studentType,
          phone,
          role: "USER",
          wallet: {
            create: {
              balance: 0,
            },
          },
          activeSessions: {
            create: {
              visitorId,
              deviceName: deviceInfo?.deviceName,
              deviceLocation: deviceInfo?.deviceLocation,
            },
          },
        },
        include: {
          wallet: true,
          activeSessions: true,
        },
      });

      return {
        status: "success",
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          studentType: user.studentType,
          phone: user.phone,
        },
      };
    }),

  signin: publicProcedure
    .input(signinSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password, visitorId, deviceInfo } = input;

      // Find user by email
      const user = await ctx.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          activeSessions: true,
        },
      });

      if (!user || !user.password) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with this email",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Check for existing active sessions
      if (user.activeSessions.length > 0) {
        const existingSession = user.activeSessions[0];

        if (existingSession.visitorId !== visitorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Account is already active on another device. Please log out from other devices first.",
          });
        }

        // Update existing session
        await ctx.prisma.activeSession.update({
          where: { id: existingSession.id },
          data: {
            lastActive: new Date(),
            deviceName: deviceInfo?.deviceName,
            deviceLocation: deviceInfo?.deviceLocation,
          },
        });
      } else {
        // Create new session
        await ctx.prisma.activeSession.create({
          data: {
            userId: user.id,
            visitorId,
            deviceName: deviceInfo?.deviceName,
            deviceLocation: deviceInfo?.deviceLocation,
          },
        });
      }

      return {
        status: "success",
        message: "Signed in successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          studentType: user.studentType,
          phone: user.phone,
        },
      };
    }),

  logout: protectedProcedure
    .input(z.object({ visitorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { visitorId } = input;

      await ctx.prisma.activeSession.deleteMany({
        where: {
          userId: ctx.session.user.id,
          visitorId,
        },
      });

      return {
        status: "success",
        message: "Logged out successfully",
      };
    }),

  validateSession: protectedProcedure
    .input(z.object({ visitorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { visitorId } = input;

      const session = await ctx.prisma.activeSession.findFirst({
        where: {
          userId: ctx.session.user.id,
          visitorId,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid session",
        });
      }

      // Update last active timestamp
      await ctx.prisma.activeSession.update({
        where: { id: session.id },
        data: { lastActive: new Date() },
      });

      return {
        status: "success",
        message: "Session is valid",
      };
    }),
});
