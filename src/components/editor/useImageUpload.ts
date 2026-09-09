import { useCallback, useState } from "react";
import { presignUpload, type UploadFolder } from "@/features/blogs/blog.api";
import { errorMessage, uploadToS3 } from "@/lib/api";

/** Must stay in sync with the image policies in the backend's presign service. */
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
const MAX_BYTES = 5 * 1024 * 1024;

export const useImageUpload = () => {
  const [progress, setProgress] = useState<number | null>(null);

  /**
   * Presign -> PUT straight to S3 -> return the public URL.
   *
   * The bytes never touch the Express server; only the ~200 byte presign call
   * does. Note the size check is client-side only: a presigned PutObject URL
   * cannot enforce a maximum size (see the backend service for why).
   */
  const upload = useCallback(async (
    file: File,
    folder: UploadFolder = "blog"
  ): Promise<string> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Use a JPG, PNG, WebP, AVIF or GIF image");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Image must be under 5 MB");
    }

    setProgress(0);
    try {
      const { uploadUrl, publicUrl } = await presignUpload(
        folder,
        file.name,
        file.type
      );

      await uploadToS3(uploadUrl, file, setProgress);

      // The API returns this explicitly -- never derive it by stripping the
      // query string off the signed URL.
      return publicUrl;
    } catch (error) {
      throw new Error(errorMessage(error, "Upload failed"));
    } finally {
      setProgress(null);
    }
  }, []);

  return { upload, progress, uploading: progress !== null };
};
