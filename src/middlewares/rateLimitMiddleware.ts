import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

interface Bucket { count: number; resetAt: number; }

const buckets = new Map<string, Bucket>();

function cleanup(now: number): void {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

export function rateLimit(options: {
    windowMs: number;
    max: number;
    key?: (req: Request) => string;
}) {
    const keyFn = options.key ?? ((req: Request) => req.ip || "unknown");

    return (req: Request, res: Response, next: NextFunction): void => {
        const now = Date.now();
        if (buckets.size > 5000) cleanup(now);

        const key = `${keyFn(req)}:${req.path}`;
        const current = buckets.get(key);

        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + options.windowMs });
            res.setHeader("X-RateLimit-Limit", options.max);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - 1));
            next();
            return;
        }

        current.count += 1;
        res.setHeader("X-RateLimit-Limit", options.max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - current.count));

        if (current.count > options.max) {
            const retryAfter = Math.ceil((current.resetAt - now) / 1000);
            res.setHeader("Retry-After", retryAfter);
            next(new AppError("Too many requests. Please try again later.", 429));
            return;
        }

        next();
    };
}
