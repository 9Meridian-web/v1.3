import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { env } from "../config/env";

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
    const requestId = String(res.locals.requestId ?? "-");

    console.error(`[${requestId}] ${req.method} ${req.originalUrl} ${error.name}: ${error.message}`);

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
            request_id: requestId,
        });
        return;
    }

    res.status(500).json({
        success: false,
        message: env.NODE_ENV === "production" ? "Internal Server Error" : error.message,
        request_id: requestId,
    });
}
