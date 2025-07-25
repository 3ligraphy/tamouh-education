import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    BUNNY_STORAGE_ZONE_NAME: z.string().min(1),
    BUNNY_STORAGE_ZONE_PASSWORD: z.string().min(1),
    BUNNY_STORAGE_HOSTNAME: z.string().min(1),
    BUNNY_PULL_ZONE_URL: z.string().url(),
    BUNNY_VIDEOS_LIBRARY_NAME: z.string().min(1),
    BUNNY_VIDEOS_LIBRARY_PASSWORD: z.string().min(1),
    BUNNY_PULL_ZONE_URL_VIDEOS: z.string().url(),
    BUNNY_PULL_ZONE_VIDEOS: z.string().min(1),
    BUNNY_VIDEO_LIBRARY_ID: z.string().min(1),
    BUNNY_VIDEO_COLLECTION_ID: z.string(),
    BUNNY_VIDEO_TOKEN_AUTH_KEY: z.string().min(1),
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_FINGERPRINT_PUBLIC_KEY: z.string().min(1),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BUNNY_STORAGE_ZONE_NAME: process.env.BUNNY_STORAGE_ZONE_NAME,
    BUNNY_STORAGE_ZONE_PASSWORD: process.env.BUNNY_STORAGE_ZONE_PASSWORD,
    BUNNY_STORAGE_HOSTNAME: process.env.BUNNY_STORAGE_HOSTNAME,
    BUNNY_PULL_ZONE_URL: process.env.BUNNY_PULL_ZONE_URL,
    BUNNY_VIDEOS_LIBRARY_NAME: process.env.BUNNY_VIDEOS_LIBRARY_NAME,
    BUNNY_VIDEOS_LIBRARY_PASSWORD: process.env.BUNNY_VIDEOS_LIBRARY_PASSWORD,
    BUNNY_PULL_ZONE_URL_VIDEOS: process.env.BUNNY_PULL_ZONE_URL_VIDEOS,
    BUNNY_PULL_ZONE_VIDEOS: process.env.BUNNY_PULL_ZONE_VIDEOS,
    BUNNY_VIDEO_LIBRARY_ID: process.env.BUNNY_VIDEO_LIBRARY_ID,
    BUNNY_VIDEO_COLLECTION_ID: process.env.BUNNY_VIDEO_COLLECTION_ID,
    BUNNY_VIDEO_TOKEN_AUTH_KEY: process.env.BUNNY_VIDEO_TOKEN_AUTH_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_FINGERPRINT_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_FINGERPRINT_PUBLIC_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
