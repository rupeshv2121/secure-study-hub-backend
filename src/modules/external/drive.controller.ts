import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import { google } from "googleapis";
import { Readable } from "stream";
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
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
};

const extractDriveFileId = (value: string) => {
  const input = String(value || "").trim();
  if (!input) return "";

  const driveMatch = input.match(/(?:drive:|\/d\/|id=)([a-zA-Z0-9_-]{10,})/);
  if (driveMatch?.[1]) return driveMatch[1];

  if (/^[a-zA-Z0-9_-]{10,}$/.test(input)) return input;

  return input;
};

const collectFileBuffer = async (fileStream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    fileStream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    fileStream.on("end", () => resolve());
    fileStream.on("error", (err: unknown) => reject(err));
  });

  return Buffer.concat(chunks);
};

export const streamDriveFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const rawFileId = req.params.id;
  const fileId = extractDriveFileId(
    Array.isArray(rawFileId) ? rawFileId[0] : rawFileId,
  );
  if (!fileId) {
    return next(new AppError("file id is required", 400));
  }

  try {
    const drive = getDriveClient();

    // Try to fetch metadata to set Content-Type and filename
    try {
      const meta = (await drive.files.get({
        fileId,
        fields: "mimeType,name",
      })) as any;
      const mime = meta.data.mimeType || "application/pdf";
      const name = meta.data.name || fileId;
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `inline; filename="${name}"`);
    } catch (metaErr) {
      // ignore metadata errors and continue
    }

    const resp = (await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" as any },
    )) as any;

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
  const rawFileId = req.params.id;
  const fileId = extractDriveFileId(
    Array.isArray(rawFileId) ? rawFileId[0] : rawFileId,
  );
  if (!fileId) return next(new AppError("file id is required", 400));

  try {
    const drive = getDriveClient();
    const meta = (await drive.files.get({
      fileId,
      fields: "id,name,mimeType,owners,size,permissions",
    })) as any;
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
  if (!req.user) return next(new AppError("Not authenticated", 401));
  if (req.user.role !== "ADMIN")
    return next(new AppError("Admin privileges required", 403));
  const rawFileId = req.params.id;
  const fileId = extractDriveFileId(
    Array.isArray(rawFileId) ? rawFileId[0] : rawFileId,
  );
  if (!fileId) return next(new AppError("file id is required", 400));

  const bucket = String(
    (req.body as any)?.bucket || req.query.bucket || "lecture-slides",
  );
  const lectureId = String(
    (req.body as any)?.lectureId || req.query.lectureId || "",
  );
  const destFilename = (req.body as any)?.filename || req.query.filename;

  try {
    const drive = getDriveClient();

    // Fetch metadata to determine filename and mime
    let meta: any = null;
    try {
      meta = (await drive.files.get({
        fileId,
        fields: "name,mimeType",
      })) as any;
    } catch (mErr) {
      // continue without name
    }

    const name = (meta?.data?.name as string) || undefined;
    const mime = (meta?.data?.mimeType as string) || "application/octet-stream";

    // download file as stream and buffer it
    const resp = (await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" as any },
    )) as any;

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
    if (!filenameToUse.includes(".") && mime === "application/pdf")
      filenameToUse = `${filenameToUse}.pdf`;

    const destPath = lectureId
      ? `${lectureId}/${filenameToUse}`
      : filenameToUse;

    const result = await uploadBufferToBucket(bucket, buffer, destPath, mime);

    res
      .status(201)
      .json({ success: true, data: { path: `${bucket}/${result.path}` } });
  } catch (e) {
    next(e);
  }
};

export const uploadDriveFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) return next(new AppError("Not authenticated", 401));
  if (req.user.role !== "ADMIN")
    return next(new AppError("Admin privileges required", 403));
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file?.path) {
    return next(new AppError("file is required", 400));
  }

  try {
    const drive = getDriveClient();
    const buffer = await collectFileBuffer(fs.createReadStream(file.path));

    const folderId =
      (req.body as any)?.folderId || env.GOOGLE_DRIVE_FOLDER_ID || undefined;

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: file.originalname || file.filename || "upload.pdf",
        mimeType: file.mimetype || "application/octet-stream",
        ...(folderId ? { parents: [String(folderId)] } : {}),
      },
      media: {
        mimeType: file.mimetype || "application/octet-stream",
        body: Readable.from([buffer]),
      },
      fields: "id,name,mimeType,webViewLink,webContentLink",
    });

    res.status(201).json({
      success: true,
      data: uploadResponse.data,
    });
  } catch (e) {
    next(e);
  } finally {
    try {
      require("fs").unlinkSync(file.path);
    } catch {}
  }
};
