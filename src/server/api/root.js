import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { authRouter } from "./routers/auth";
import { categoryRouter } from "./routers/category";
import { courseRouter } from "./routers/course";
import { instructorRouter } from "./routers/instructor";
import { studentRouter } from "./routers/student";
import { subscriptionRouter } from "./routers/subscription";
import { transactionsRouter } from "./routers/transactions";
import { uploadRouter } from "./routers/upload";
import { userRouter } from "./routers/user";
import { walletRouter } from "./routers/wallet";
import { specialistRouter } from "./routers/specialist";
import { quizRouter } from "./routers/quiz";
import { certificateRouter } from "./routers/certificate";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  category: categoryRouter,
  course: courseRouter,
  instructor: instructorRouter,
  student: studentRouter,
  subscription: subscriptionRouter,
  transactions: transactionsRouter,
  upload: uploadRouter,
  user: userRouter,
  wallet: walletRouter,
  specialist: specialistRouter,
  quiz: quizRouter,
  certificate: certificateRouter,
});

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const result = await trpc.post.all();
 */
export const createCaller = createCallerFactory(appRouter);
