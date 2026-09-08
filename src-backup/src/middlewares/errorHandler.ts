import {

    Request,

    Response,

    NextFunction

} from "express";

import { AppError } from "../errors/AppError";

export function errorHandler(

    error: Error,

    req: Request,

    res: Response,

    next: NextFunction

): void {

    console.error("\n========== ERROR ==========");
    console.error(req.method, req.originalUrl);
    console.error(error);
    console.error("===========================\n");

    if (error instanceof AppError) {

        res.status(error.statusCode).json({

            success: false,

            message: error.message

        });

        return;

    }

    res.status(500).json({

        success: false,

        message:

            process.env.NODE_ENV === "production"

                ? "Internal Server Error"

                : error.message

    });

}