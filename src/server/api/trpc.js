/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/server/auth";
import prisma from "@/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */
export const createTRPCContext = async (opts) => {
  const session = await auth();

  return {
    prisma,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
const t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();
  const end = Date.now();

  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Authentication middleware
 */
const enforceUserIsAuthed = t.middleware(async ({ next }) => {
  const session = await auth();

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session,
      user: session.user,
    },
  });
});

/**
 * Admin middleware
 */
const enforceUserIsAdmin = t.middleware(async ({ next }) => {
  const session = await auth();

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (session.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can access this resource",
    });
  }

  return next({
    ctx: {
      session,
      user: session.user,
    },
  });
});

/**
 * Public procedure (unauthenticated)
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure (authenticated)
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed);

/**
 * Admin procedure (authenticated + admin role)
 */
export const adminProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAdmin);
