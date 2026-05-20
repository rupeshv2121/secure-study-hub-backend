import fs from "fs";
import path from "path";
import { getSupabaseClient } from "../../lib/supabase";
import { AppError } from "../../utils/app-error";

const SIGNED_URL_EXPIRY_SECONDS = 300;

const normalizeStoragePath = (value: string) => {
  const normalized = path.posix
    .normalize(value.replace(/\\/g, "/"))
    .replace(/^\/+/, "");

  if (!normalized || normalized === "." || normalized.startsWith("..")) {
    throw new AppError("Invalid storage path", 400);
  }

  return normalized;
};

const resolveBucketPath = (bucket: string, value: string) => {
  const normalized = normalizeStoragePath(value);
  const prefix = `${bucket}/`;

  if (normalized === bucket) {
    throw new AppError("Invalid storage path", 400);
  }

  if (normalized.startsWith(prefix)) {
    return normalized.slice(prefix.length);
  }

  return normalized;
};

export const uploadFileToBucket = async (
  bucket: string,
  file: any,
  prefix?: string,
) => {
  if (!bucket) {
    throw new AppError("Bucket is required", 400);
  }

  if (!file?.path) {
    throw new AppError("No file uploaded", 400);
  }

  const baseName = normalizeStoragePath(String(file.originalname || ""));
  const storagePath = prefix
    ? normalizeStoragePath(path.posix.join(String(prefix), baseName))
    : baseName;
  const fileBuffer = fs.readFileSync(file.path);

  try {
    const supabase = getSupabaseClient();
    let result = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: true,
      });

    // If bucket doesn't exist, try to create it and retry once.
    if (
      result.error &&
      String(result.error.message).toLowerCase().includes("bucket")
    ) {
      try {
        await supabase.storage.createBucket(bucket, { public: false });
        result = await supabase.storage
          .from(bucket)
          .upload(storagePath, fileBuffer, {
            contentType: file.mimetype || "application/octet-stream",
            upsert: true,
          });
      } catch (createErr) {
        // fall through to error handling below
        result = result;
      }
    }

    if (result.error) {
      const msg = result.error.message || "Failed to upload file";
      const isQuota =
        String(msg).toLowerCase().includes("quota") ||
        String(msg).toLowerCase().includes("exceed");
      throw new AppError(`Failed to upload file: ${msg}`, isQuota ? 413 : 500);
    }

    return { path: storagePath };
  } finally {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
};

export const removeFilesFromBucket = async (
  bucket: string,
  paths: string[],
) => {
  if (!bucket) {
    throw new AppError("Bucket is required", 400);
  }

  const results = [] as Array<{
    path: string;
    removed: boolean;
    error?: string;
  }>;

  for (const rawPath of paths) {
    try {
      const storagePath = resolveBucketPath(bucket, rawPath);
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);

      if (error) {
        results.push({ path: rawPath, removed: false, error: error.message });
        continue;
      }

      results.push({ path: storagePath, removed: true });
    } catch (error) {
      results.push({ path: rawPath, removed: false, error: String(error) });
    }
  }

  return results;
};

export const createSignedUrlForBucket = async (
  bucket: string,
  rawPath: string,
) => {
  if (!bucket) {
    throw new AppError("Bucket is required", 400);
  }

  const storagePath = resolveBucketPath(bucket, rawPath);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    const msg = error?.message || "Failed to create signed URL";
    const isNotFound =
      (error && (error as any).status === 404) ||
      String(msg).toLowerCase().includes("not_found") ||
      String(msg).toLowerCase().includes("object not found");

    throw new AppError(msg, isNotFound ? 404 : 500);
  }

  return {
    path: storagePath,
    signedUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  };
};
