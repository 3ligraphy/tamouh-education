"use client";

import { useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";

import { fpPromise } from "./fp-provider";

import { api } from "@/trpc/react";

export default function SessionValidator() {
  const { data: session, status } = useSession();
  const utils = api.useUtils();

  const validateSession = useCallback(async () => {
    if (status !== "authenticated" || !session?.user) return;

    try {
      const fp = await fpPromise;
      const result = await fp.get();

      // Use direct mutation instead of query
      await utils.auth.validateSession.fetch({ visitorId: result.visitorId });
    } catch (error) {
      console.error("Session validation failed:", error);

      // Only sign out for specific session-related errors
      if (
        error?.data?.code === "UNAUTHORIZED" &&
        error?.message === "Invalid session"
      ) {
        await signOut({
          redirect: true,
          callbackUrl: "/signin?error=session_expired",
        });
      }
    }
  }, [session, status, utils.auth.validateSession]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    // Initial validation after a delay
    const initialTimeout = setTimeout(() => {
      validateSession();
    }, 10000);

    // Periodic validation
    const interval = setInterval(validateSession, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [session, status, validateSession]);

  return null;
}
