import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";

function safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

export function internalWebhookMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!env.INTERNAL_WEBHOOK_SECRET) {
        next(new AppError("Internal webhook authentication is not configured.", 503));
        return;
    }

    const supplied = req.header("x-internal-webhook-secret") ?? "";
    if (!safeEqual(supplied, env.INTERNAL_WEBHOOK_SECRET)) {
        next(new AppError("Unauthorized.", 401));
        return;
    }

    next();
}
