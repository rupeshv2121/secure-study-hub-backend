import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { env } from "../../config/env";
import { adminOnly, authMiddleware } from "../../middlewares/auth.middleware";
import {
  getDriveMetadata,
  importDriveFile,
  streamDriveFile,
  uploadDriveFile,
} from "./drive.controller";

const router = Router();
const uploadDir = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join("tmp", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// Stream a Google Drive file through the backend (requires auth)
router.get("/drive/:id/stream", authMiddleware, async (req, res, next) => {
  try {
    await streamDriveFile(req, res, next as any);
  } catch (e) {
    next(e);
  }
});

// Import a Drive file into storage (admin only)
router.post(
  "/drive/:id/import",
  authMiddleware,
  adminOnly,
  async (req, res, next) => {
    try {
      await importDriveFile(req, res, next as any);
    } catch (e) {
      next(e);
    }
  },
);

// Upload a file directly to Google Drive (admin only)
router.post(
  "/drive/upload",
  authMiddleware,
  adminOnly,
  upload.single("file"),
  async (req, res, next) => {
    try {
      await uploadDriveFile(req, res, next as any);
    } catch (e) {
      next(e);
    }
  },
);

// Development-only debug route (no auth) for quick local testing
if (env.NODE_ENV === "development") {
  router.get("/drive/:id/debug", async (req, res, next) => {
    try {
      await streamDriveFile(req, res, next as any);
    } catch (e) {
      next(e);
    }
  });

  // Metadata check endpoint (dev only) - returns JSON about file and permissions
  router.get("/drive/:id/meta", async (req, res, next) => {
    try {
      await getDriveMetadata(req, res, next as any);
    } catch (e) {
      next(e);
    }
  });

  // Simple test page to paste a Drive file ID and preview via the debug route
  router.get("/test", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Drive Test Viewer</title>
    <style>body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:20px}label,input{display:block;margin-bottom:8px}iframe{width:100%;height:80vh;border:1px solid #ccc}</style>
  </head>
  <body>
    <h2>Google Drive Proxy Test (development only)</h2>
    <p>Paste a Drive file ID below and click <em>Load</em>. Files must be shared with the service account.</p>
    <label for="fileId">File ID</label>
    <input id="fileId" placeholder="Enter Drive file ID" style="width:50%" />
    <button id="load">Load</button>
    <button id="check" style="margin-left:8px">Check access</button>
    <div style="margin-top:12px"><iframe id="viewer" src="about:blank"></iframe></div>
    <pre id="meta" style="background:#f3f4f6;padding:12px;margin-top:12px;white-space:pre-wrap;max-height:200px;overflow:auto"></pre>
    <script>
      document.getElementById('load').addEventListener('click', function(){
        var id = document.getElementById('fileId').value.trim();
        if(!id){ alert('Enter file id'); return }
        document.getElementById('viewer').src = '/api/external/drive/' + encodeURIComponent(id) + '/debug';
      });

      document.getElementById('check').addEventListener('click', async function(){
        var id = document.getElementById('fileId').value.trim();
        if(!id){ alert('Enter file id'); return }
        const res = await fetch('/api/external/drive/' + encodeURIComponent(id) + '/meta');
        const text = await res.text();
        document.getElementById('meta').textContent = text;
      });
    </script>
  </body>
</html>`);
  });
}

export { router as externalRouter };
