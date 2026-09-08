import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header("x-request-id");
    const requestId = incoming && /^[A-Za-z0-9._:-]{8,100}$/.test(incoming)
        ? incoming
        : randomUUID();

    res.setHeader("x-request-id", requestId);
    res.locals.requestId = requestId;
    next();
}
