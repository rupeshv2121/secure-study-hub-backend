import type { Request, Response } from "express";
import { AppError } from "../../utils/app-error";
import {
  createSignedUrlForBucket,
  removeFilesFromBucket,
  uploadFileToBucket,
} from "./storage.service";

export const uploadController = async (req: Request, res: Response) => {
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

  const data = await createSignedUrlForBucket(bucket, String(pathValue));
  res.json({ success: true, data });
};
