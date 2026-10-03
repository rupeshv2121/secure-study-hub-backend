import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

interface RateLimitOptions {
  windowMs: number;
  max: number;
  // Returns the identity to count against, or undefined to skip limiting.
  key: (req: Request) => string | undefined;
  message: string;
}

const SWEEP_THRESHOLD = 10_000;

// Fixed-window, in-memory limiter. Counts live in this process only, so on
// serverless each warm instance keeps its own tally: it slows abuse down
// rather than enforcing an exact global cap.
export const rateLimit = ({ windowMs, max, key, message }: RateLimitOptions) => {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const id = key(req);
    if (!id) {
      next();
      return;
    }

    const now = Date.now();

    // Drop expired windows once the map grows, so memory stays bounded.
    if (buckets.size > SWEEP_THRESHOLD) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    let bucket = buckets.get(id);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(id, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ success: false, message });
      return;
    }

    next();
  };
};
