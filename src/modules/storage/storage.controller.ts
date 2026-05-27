import type { Request, Response } from "express";
import { getSupabaseClient } from "../../lib/supabase";
import { AppError } from "../../utils/app-error";
import {
  createSignedUrlForBucket,
  removeFilesFromBucket,
  resolveBucketPath,
  uploadFileToBucket,
} from "./storage.service";

export const uploadController = async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Not authenticated" });
    return;
  }
  if (req.user.role !== "ADMIN") {
    res
      .status(403)
      .json({ success: false, message: "Admin privileges required" });
    return;
  }
  const file = (req as any).file as any;
  const bucket = String(req.params.bucket);
  const prefixFromBody = (req.body as any)?.prefix as string | undefined;
  const prefixFromQueryRaw = req.query.prefix;
  const prefixFromQuery = Array.isArray(prefixFromQueryRaw)
    ? String(prefixFromQueryRaw[0])
    : prefixFromQueryRaw
      ? String(prefixFromQueryRaw)
      : undefined;
  const prefix = prefixFromBody || prefixFromQuery;

  const data = await uploadFileToBucket(
    bucket,
    file,
    prefix as string | undefined,
  );

  res
    .status(201)
    .json({ success: true, data: { path: `${bucket}/${data.path}` } });
};

export const removeController = async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Not authenticated" });
    return;
  }
  if (req.user.role !== "ADMIN") {
    res
      .status(403)
      .json({ success: false, message: "Admin privileges required" });
    return;
  }
  const bucket = String(req.params.bucket);
  const paths = (req.body as any)?.paths as string[] | undefined;
  if (!paths || !Array.isArray(paths)) {
    res.status(400).json({ success: false, message: "paths array required" });
    return;
  }

  const results = await removeFilesFromBucket(bucket, paths);

  res.json({ success: true, data: results });
};

export const signedUrlController = async (req: Request, res: Response) => {
  const bucket = String(req.params.bucket);
  const rawPath = req.query.path;
  const pathValue = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!pathValue) {
    throw new AppError("path query parameter is required", 400);
  }
  try {
    const data = await createSignedUrlForBucket(bucket, String(pathValue));
    res.json({ success: true, data });
  } catch (err) {
    const e = err as any;
    // If object not found, provide diagnostic details to help debugging
    if (
      e?.status === 404 ||
      String(e?.message || "")
        .toLowerCase()
        .includes("not_found") ||
      String(e?.message || "")
        .toLowerCase()
        .includes("object not found")
    ) {
      try {
        const storagePath = resolveBucketPath(bucket, String(pathValue));
        const parts = storagePath.split("/");
        const filename = parts.pop() || "";
        const parent = parts.join("/");
        const supabase = getSupabaseClient();
        const listRes = await supabase.storage
          .from(bucket)
          .list(parent || "", { limit: 1000 });

        res.status(404).json({
          success: false,
          message: e?.message || "Object not found",
          attemptedPath: storagePath,
          parent,
          filename,
          items: (listRes.data || []).slice(0, 50),
        });
        return;
      } catch (inner) {
        res.status(404).json({
          success: false,
          message: e?.message || "Object not found",
          attemptedPath: String(pathValue),
        });
        return;
      }
    }

    throw err;
  }
};

export const existsController = async (req: Request, res: Response) => {
  const bucket = String(req.params.bucket);
  const rawPath = req.query.path;
  const pathValue = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!pathValue) {
    throw new AppError("path query parameter is required", 400);
  }

  try {
    const storagePath = resolveBucketPath(bucket, String(pathValue));

    // split to parent folder and filename
    const parts = storagePath.split("/");
    const filename = parts.pop() || "";
    const parent = parts.join("/");

    const supabase = getSupabaseClient();
    // list parent folder
    const listRes = await supabase.storage
      .from(bucket)
      .list(parent || "", { limit: 1000 });

    if (listRes.error) {
      throw new AppError(listRes.error.message || "Failed to list bucket", 500);
    }

    const found = (listRes.data || []).some(
      (item: any) => item.name === filename,
    );

    res.json({
      success: true,
      data: {
        exists: found,
        attemptedPath: storagePath,
        parent,
        filename,
        items: (listRes.data || []).slice(0, 50),
      },
    });
  } catch (err) {
    const e = err as any;
    res
      .status(e?.status || 500)
      .json({ success: false, message: e?.message || String(e) });
  }
};
