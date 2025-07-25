import { createHash } from "crypto";

import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { env } from "@/env";

const getStorageUrl = (path, fileType) => {
  // BunnyCDN storage API endpoint (for uploading only)
  if (fileType === "video") {
    return `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos`;
  }

  // For images and PDFs, use the regular storage zone with the full path
  return `https://${env.BUNNY_STORAGE_HOSTNAME}/${env.BUNNY_STORAGE_ZONE_NAME}/${path}`;
};

const generateVideoToken = (videoId, expirationTime = 7200) => {
  // Current time in seconds
  const now = Math.floor(Date.now() / 1000);
  // Token expiration time (2 hours by default)
  const expiration = now + expirationTime;
  const securityKey = env.BUNNY_VIDEO_TOKEN_AUTH_KEY;

  // According to docs: SHA256_HEX(token_security_key + video_id + expiration)
  const signatureBase = `${securityKey}${videoId}${expiration}`;

  console.log("Debug Token Generation:", {
    videoId,
    expiration,
    securityKey,
    signatureBase,
  });

  // Generate token using SHA256 (not HMAC) and output as hex
  const token = createHash("sha256").update(signatureBase).digest("hex");

  console.log("Generated Token:", token);

  return {
    token,
    expires: expiration,
  };
};

const getCDNUrl = (path, fileType, user) => {
  // BunnyCDN CDN endpoint (for accessing files)
  if (fileType === "video") {
    // Only generate secure tokens for authorized users
    const isAuthorized =
      user &&
      (user.role === "ADMIN" ||
        user.role === "INSTRUCTOR" ||
        user.role === "SUBSCRIBER");

    if (!isAuthorized) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be subscribed to access video content",
      });
    }

    // Generate a secure token for the video
    const { token, expires } = generateVideoToken(path);

    // Return the iframe embed URL with all necessary parameters in exact order
    return `https://iframe.mediadelivery.net/embed/${env.BUNNY_VIDEO_LIBRARY_ID}/${path}?token=${token}&expires=${expires}&autoplay=true&loop=false&muted=false&preload=true&responsive=true`;
  }

  // For regular storage (images and PDFs), return the CDN URL with the full path
  return `${env.BUNNY_PULL_ZONE_URL}/${path}`;
};

const getVideoMetadata = async (videoId) => {
  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          Accept: "application/json",
          AccessKey: env.BUNNY_VIDEOS_LIBRARY_PASSWORD,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch video metadata: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      length: data.length, // Duration in seconds
      title: data.title,
      status: data.status,
      thumbnailUrl: data.thumbnailUrl,
      resolution: data.resolution,
      encodeProgress: data.encodeProgress,
    };
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    throw error;
  }
};

export const uploadRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["image", "video", "pdf"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { fileName, fileType } = input;

      // First check if we have the required configuration
      if (!env.BUNNY_STORAGE_ZONE_NAME || !env.BUNNY_STORAGE_ZONE_PASSWORD) {
        console.error("Missing BunnyCDN configuration");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Storage configuration is missing",
        });
      }

      // Handle different file types
      if (fileType === "video") {
        // Additional check for video-specific configuration
        if (!env.BUNNY_VIDEO_LIBRARY_ID || !env.BUNNY_VIDEOS_LIBRARY_PASSWORD) {
          console.error("Missing BunnyCDN video configuration");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Video storage configuration is missing",
          });
        }

        try {
          // Log the request details for debugging
          console.log("Creating video with configuration:", {
            libraryId: env.BUNNY_VIDEO_LIBRARY_ID,
            fileName,
            url: `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos`,
          });

          // Step 1: Create the video object
          const createResponse = await fetch(
            `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                AccessKey: env.BUNNY_VIDEOS_LIBRARY_PASSWORD,
              },
              body: JSON.stringify({
                title: fileName,
                collectionId: env.BUNNY_VIDEO_COLLECTION_ID,
              }),
            }
          );

          const responseText = await createResponse.text();

          console.log("Raw response:", responseText);

          if (!createResponse.ok) {
            console.error("Video creation failed:", {
              status: createResponse.status,
              statusText: createResponse.statusText,
              response: responseText,
              headers: createResponse.headers,
              url: createResponse.url,
            });

            // Check if it's an authentication error
            if (createResponse.status === 401) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid API key or authentication failed",
              });
            }

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create video: ${responseText}`,
            });
          }

          let data;

          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error("Failed to parse response:", e);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Invalid response from video service",
            });
          }

          if (!data.guid) {
            console.error("No GUID in response:", data);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Invalid response: missing video ID",
            });
          }

          const videoId = data.guid;

          console.log("Video created successfully with ID:", videoId);

          // Return direct upload URL
          return {
            uploadUrl: `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos/${videoId}`,
            cdnUrl: getCDNUrl(videoId, fileType, ctx.session.user),
            headers: {
              AccessKey: env.BUNNY_VIDEOS_LIBRARY_PASSWORD,
              "Content-Type": "application/octet-stream",
            },
            path: videoId,
            videoId,
          };
        } catch (error) {
          console.error("Error creating video:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to create video",
            cause: error,
          });
        }
      } else {
        // Handle images and PDFs using the regular storage
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);

        // Determine the correct folder based on file type
        const folder = fileType === "pdf" ? "documents" : "images";

        // Create a clean filename without spaces and special characters
        const cleanFileName = fileName
          .replace(/[^a-zA-Z0-9.]/g, "-")
          .toLowerCase();

        // Construct the full path with the correct folder structure
        const path = `${folder}/${timestamp}-${randomString}-${cleanFileName}`;

        console.log("Uploading file to storage:", {
          fileType,
          folder,
          path,
          fileName: cleanFileName,
        });

        return {
          uploadUrl: getStorageUrl(path, fileType),
          cdnUrl: getCDNUrl(path, fileType, ctx.session.user),
          headers: {
            AccessKey: env.BUNNY_STORAGE_ZONE_PASSWORD,
            "Content-Type": fileType === "pdf" ? "application/pdf" : "image/*",
          },
          path,
        };
      }
    }),
  // Add a new endpoint to get a secure video URL
  getSecureVideoUrl: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
      })
    )
    .query(({ input }) => {
      const { videoId } = input;

      // Generate a secure token for the video
      const { token, expires } = generateVideoToken(videoId);

      const url = `https://iframe.mediadelivery.net/embed/${env.BUNNY_VIDEO_LIBRARY_ID}/${videoId}?token=${token}&expires=${expires}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

      console.log("Generated URL:", url);

      // Return the iframe embed URL with all necessary parameters
      return {
        url,
      };
    }),

  deleteFile: protectedProcedure
    .input(
      z.object({
        path: z.string(),
        fileType: z.enum(["image", "video", "pdf"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { path, fileType = "image" } = input;

      try {
        let url;
        let headers;

        if (fileType === "video") {
          url = `https://video.bunnycdn.com/library/${env.BUNNY_VIDEO_LIBRARY_ID}/videos/${path}`;
          headers = {
            AccessKey: env.BUNNY_VIDEOS_LIBRARY_PASSWORD,
          };
        } else {
          url = `https://${env.BUNNY_STORAGE_HOSTNAME}/${env.BUNNY_STORAGE_ZONE_NAME}/${path}`;
          headers = {
            AccessKey: env.BUNNY_STORAGE_ZONE_PASSWORD,
          };
        }

        const response = await fetch(url, {
          method: "DELETE",
          headers,
        });

        if (!response.ok) {
          const responseText = await response.text();

          console.error("Delete failed:", responseText);
          throw new Error(`Failed to delete file: ${response.statusText}`);
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete file",
          cause: error,
        });
      }
    }),

  getVideoMetadata: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { videoId } = input;

      return getVideoMetadata(videoId);
    }),

  getMultipleVideosMetadata: protectedProcedure
    .input(
      z.object({
        videoIds: z.array(z.string()),
      })
    )
    .query(async ({ input }) => {
      const { videoIds } = input;

      // Fetch metadata for all videos in parallel
      const metadataPromises = videoIds.map(async (videoId) => {
        try {
          const metadata = await getVideoMetadata(videoId);

          return [videoId, metadata];
        } catch (error) {
          console.error(`Error fetching metadata for video ${videoId}:`, error);

          return [videoId, null];
        }
      });

      const metadataResults = await Promise.all(metadataPromises);

      // Convert array of results to an object with videoId as keys
      return Object.fromEntries(metadataResults);
    }),
});
