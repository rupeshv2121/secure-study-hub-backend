import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Authorization header missing or malformed", 401);
  }

  const token = header.split(" ", 2)[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err) {
    throw new AppError("Invalid or expired token", 401);
  }
};

// For public routes whose response depends on who is asking (e.g. admins also
// see draft lectures). Attaches req.user when a valid token is present and
// otherwise continues anonymously — it never rejects the request.
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.split(" ", 2)[1], env.JWT_SECRET) as any;
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      // invalid or expired token: treat as anonymous
    }
  }
  next();
};

export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError("Not authenticated", 401);
  }

  if (req.user.role !== "ADMIN") {
    throw new AppError("Admin privileges required", 403);
  }

  next();
};
