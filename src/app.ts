import cors from "cors";
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { router } from "./routes";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
const allowedOrigins = "http://localhost:8080,http://localhost:8081".split(",");
console.log("CORS allowlist:", allowedOrigins);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());

// Serve uploaded files (lecture slides, etc.) from /uploads
const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));

app.use("/api", router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
