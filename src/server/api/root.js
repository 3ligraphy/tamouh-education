import { transactionsRouter } from "./routers/transactions";

import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { courseRouter } from "@/server/api/routers/course";
import { categoryRouter } from "@/server/api/routers/category";
import { authRouter } from "@/server/api/routers/auth";
import { uploadRouter } from "@/server/api/routers/upload";
import { instructorRouter } from "@/server/api/routers/instructor";
import { subscriptionRouter } from "@/server/api/routers/subscription";
import { studentRouter } from "@/server/api/routers/student";
import { specialistRouter } from "@/server/api/routers/specialist";
import { walletRouter } from "@/server/api/routers/wallet";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  course: courseRouter,
  upload: uploadRouter,
  category: categoryRouter,
  user: userRouter,
  instructor: instructorRouter,
  subscription: subscriptionRouter,
  student: studentRouter,
  specialist: specialistRouter,
  wallet: walletRouter,
  transactions: transactionsRouter,
});
