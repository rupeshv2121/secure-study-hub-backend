import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export const uploadController = async (req: Request, res: Response) => {
  // multer will populate req.file
  const file = (req as any).file;
  const bucket = req.params.bucket;
  if (!file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }

  const destDir = path.join(UPLOAD_ROOT, bucket);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, file.originalname);
  fs.renameSync(file.path, destPath);

  res
    .status(201)
    .json({ success: true, data: { path: `${bucket}/${file.originalname}` } });
};

export const removeController = async (req: Request, res: Response) => {
  const bucket = req.params.bucket;
  const paths = (req.body as any)?.paths as string[] | undefined;
  if (!paths || !Array.isArray(paths)) {
    res.status(400).json({ success: false, message: "paths array required" });
    return;
  }

  const results = [] as any[];
  for (const p of paths) {
    const fp = path.join(UPLOAD_ROOT, p);
    try {
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        results.push({ path: p, removed: true });
      } else {
        results.push({ path: p, removed: false });
      }
    } catch (e) {
      results.push({ path: p, removed: false, error: String(e) });
    }
  }

  res.json({ success: true, data: results });
};
