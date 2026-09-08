import express, {
    Application,
    Request,
    Response,
    NextFunction
} from "express";

import cors from "cors";

import helmet from "helmet";

import morgan from "morgan";

import routes from "./routes";

import { errorHandler } from "./middlewares/errorHandler";

const app: Application = express();

/*
|--------------------------------------------------------------------------
| Request Debug Logger
|--------------------------------------------------------------------------
*/

app.use(

    (
        req: Request,
        _res: Response,
        next: NextFunction
    ): void => {

        console.log(
            `➡️ ${req.method} ${req.originalUrl}`
        );

        next();

    }

);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
|
| Keep this BEFORE the rest of the application middleware.
| This endpoint must respond without touching:
|
| - AI
| - Supabase
| - Google
| - Authentication
| - API routes
|
*/

app.get(

    "/",

    (
        _req: Request,
        res: Response
    ): void => {

        console.log(
            "✅ Health check request received"
        );

        res.status(200).json({

            success: true,

            message:
                "AI Receptionist Backend is running."

        });

    }

);

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(

    helmet()

);

app.use(

    cors()

);

/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/

app.use(

    express.json({

        limit: "1mb"

    })

);

app.use(

    express.urlencoded({

        extended: true,

        limit: "1mb"

    })

);

/*
|--------------------------------------------------------------------------
| Logger
|--------------------------------------------------------------------------
*/

app.use(

    morgan("dev")

);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(

    "/api",

    routes

);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use(

    (
        req: Request,
        res: Response
    ): void => {

        res.status(404).json({

            success: false,

            message:
                "Route not found.",

            path:
                req.originalUrl

        });

    }

);

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(

    errorHandler

);

export { app };

export default app;