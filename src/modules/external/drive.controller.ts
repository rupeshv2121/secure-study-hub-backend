import type { NextFunction, Request, Response } from "express";
import { google } from "googleapis";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { uploadBufferToBucket } from "../storage/storage.service";

const getDriveClient = () => {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new AppError("Google service account not configured", 500);
  }

  let creds: any;
  try {
    creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    throw new AppError("Invalid GOOGLE_SERVICE_ACCOUNT_JSON", 500);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
};

export const streamDriveFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const fileId = req.params.id;
  if (!fileId) {
    return next(new AppError("file id is required", 400));
  }

  try {
    const drive = getDriveClient();

    // Try to fetch metadata to set Content-Type and filename
    try {
      const meta = await drive.files.get({ fileId, fields: "mimeType,name" });
      const mime = meta.data.mimeType || "application/pdf";
      const name = meta.data.name || fileId;
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `inline; filename="${name}"`);
    } catch (metaErr) {
      // ignore metadata errors and continue
    }

    const resp = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" as any },
    );

    (resp.data as any).on("error", (err: unknown) => {
      next(new AppError(String(err || "Failed to stream file"), 500));
    });

    (resp.data as any).pipe(res);
  } catch (e) {
    next(e);
  }
};

export const getDriveMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const fileId = req.params.id;
  if (!fileId) return next(new AppError("file id is required", 400));

  try {
    const drive = getDriveClient();
    const meta = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,owners,size,permissions",
    });
    res.json({ success: true, data: meta.data });
  } catch (e) {
    next(e);
  }
};

export const importDriveFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const fileId = req.params.id;
  if (!fileId) return next(new AppError("file id is required", 400));

  const bucket = String((req.body as any)?.bucket || req.query.bucket || "lecture-slides");
  const lectureId = String((req.body as any)?.lectureId || req.query.lectureId || "");
  const destFilename = (req.body as any)?.filename || req.query.filename;

  try {
    const drive = getDriveClient();

    // Fetch metadata to determine filename and mime
    let meta: any = null;
    try {
      meta = await drive.files.get({ fileId, fields: "name,mimeType" });
    } catch (mErr) {
      // continue without name
    }

    const name = (meta?.data?.name as string) || undefined;
    const mime = (meta?.data?.mimeType as string) || "application/octet-stream";

    // download file as stream and buffer it
    const resp = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" as any });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      (resp.data as any).on("data", (d: Buffer) => chunks.push(Buffer.from(d)));
      (resp.data as any).on("end", () => resolve());
      (resp.data as any).on("error", (err: unknown) => reject(err));
    });

    const buffer = Buffer.concat(chunks);

    // decide destination path
    let filenameToUse = destFilename || name || `${fileId}.pdf`;
    // try to preserve extension if missing
    if (!filenameToUse.includes('.') && mime === 'application/pdf') filenameToUse = `${filenameToUse}.pdf`;

    const destPath = lectureId ? `${lectureId}/${filenameToUse}` : filenameToUse;

    const result = await uploadBufferToBucket(bucket, buffer, destPath, mime);

    res.status(201).json({ success: true, data: { path: `${bucket}/${result.path}` } });
  } catch (e) {
    next(e);
  }
};
