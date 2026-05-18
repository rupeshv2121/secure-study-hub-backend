import { Router } from "express";
import multer from "multer";
import { removeController, uploadController } from "./storage.controller";

const router = Router();

const upload = multer({ dest: "tmp/uploads" });

router.post("/:bucket/upload", upload.single("file"), uploadController);
router.post("/:bucket/remove", removeController);

export { router as storageRouter };
