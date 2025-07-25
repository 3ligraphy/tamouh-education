import { useState } from "react";

import { api } from "@/trpc/react";

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const getUploadUrlMutation = api.upload.getUploadUrl.useMutation();
  const deleteFileMutation = api.upload.deleteFile.useMutation();
  const getSecureVideoUrl = api.upload.getSecureVideoUrl.useQuery;

  const uploadFile = async (file, fileType) => {
    try {
      setIsUploading(true);
      setProgress(0);

      console.log(`Starting ${fileType} upload process for file:`, file.name);

      // Get the upload URL and headers
      const { uploadUrl, cdnUrl, headers, path, videoId } =
        await getUploadUrlMutation.mutateAsync({
          fileName: file.name,
          fileType: fileType,
        });

      console.log("Upload configuration:", { uploadUrl, headers });

      // Upload the file
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;

            setProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error"));
        };

        xhr.open("PUT", uploadUrl);

        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.send(file);
      });

      setProgress(100);
      console.log(`${fileType} will be available at:`, cdnUrl);

      return { cdnUrl, path, videoId };
    } catch (error) {
      console.error(`${fileType} upload failed:`, error);
      setProgress(0);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (path, fileType = "image") => {
    return deleteFileMutation.mutateAsync({ path, fileType });
  };

  const getVideoUrl = (videoId, options = { enabled: true }) => {
    const query = getSecureVideoUrl(
      { videoId },
      {
        ...options,
        refetchInterval: 45 * 60 * 1000, // Refresh token every 45 minutes
      }
    );

    return query;
  };

  return {
    uploadFile,
    deleteFile,
    getVideoUrl,
    isUploading,
    progress,
  };
};
