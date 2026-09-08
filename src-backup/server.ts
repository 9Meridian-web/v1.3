import { createServer } from "node:http";

import { app } from "./app";

import { env } from "./config/env";

/*
|--------------------------------------------------------------------------
| Create HTTP Server
|--------------------------------------------------------------------------
*/

const server = createServer(

    app

);

/*
|--------------------------------------------------------------------------
| Server Error Handler
|--------------------------------------------------------------------------
*/

server.on(

    "error",

    (error: Error) => {

        console.error(
            "❌ HTTP Server Error"
        );

        console.error(
            error
        );

    }

);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

server.listen(

    env.PORT,

    "127.0.0.1",

    () => {

        console.log(
            "======================================"
        );

        console.log(
            "🚀 AI Receptionist Backend Started"
        );

        console.log(
            "======================================"
        );

        console.log(
            `🌐 Server  : http://127.0.0.1:${env.PORT}`
        );

        console.log(
            `🌍 Mode    : ${env.NODE_ENV}`
        );

        console.log(
            "======================================"
        );

    }

);

/*
|--------------------------------------------------------------------------
| Graceful Shutdown
|--------------------------------------------------------------------------
*/

const shutdown = (

    signal: string

): void => {

    console.log(
        `\n${signal} received. Shutting down...`
    );

    server.close(

        () => {

            console.log(
                "✅ HTTP Server Closed"
            );

            process.exit(0);

        }

    );

};

/*
|--------------------------------------------------------------------------
| Shutdown Signals
|--------------------------------------------------------------------------
*/

process.on(

    "SIGINT",

    () => {

        shutdown(
            "SIGINT"
        );

    }

);

process.on(

    "SIGTERM",

    () => {

        shutdown(
            "SIGTERM"
        );

    }

);

/*
|--------------------------------------------------------------------------
| Unhandled Promise Rejections
|--------------------------------------------------------------------------
*/

process.on(

    "unhandledRejection",

    (
        reason
    ) => {

        console.error(
            "❌ Unhandled Promise Rejection"
        );

        console.error(
            reason
        );

        shutdown(
            "UNHANDLED_REJECTION"
        );

    }

);

/*
|--------------------------------------------------------------------------
| Uncaught Exceptions
|--------------------------------------------------------------------------
*/

process.on(

    "uncaughtException",

    (
        error: Error
    ) => {

        console.error(
            "❌ Uncaught Exception"
        );

        console.error(
            error
        );

        process.exit(1);

    }

);