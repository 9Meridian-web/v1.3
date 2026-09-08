import { createServer } from "node:http";

import { app } from "./app";
import { env } from "./config/env";

import { DodoPaymentsService } from "./services/dodoPaymentsService";


/*
|--------------------------------------------------------------------------
| Server Configuration
|--------------------------------------------------------------------------
*/

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const DISPLAY_HOST =
    process.env.DISPLAY_HOST ||
    "127.0.0.1";


/*
|--------------------------------------------------------------------------
| HTTP Server
|--------------------------------------------------------------------------
*/

const server =
    createServer(app);


/*
|--------------------------------------------------------------------------
| Dodo Payments Webhook Worker
|--------------------------------------------------------------------------
|
| Webhooks are persisted into the database first.
|
| This worker continuously processes pending webhook events.
|
| Important:
| - The worker does NOT run multiple copies simultaneously in this
|   process.
| - The database claim logic inside DodoPaymentsService provides protection
|   when multiple application instances are running.
|--------------------------------------------------------------------------
*/

const WEBHOOK_WORKER_INTERVAL_MS =
    10_000;


let webhookWorkerTimer:
    NodeJS.Timeout | null = null;


let webhookWorkerRunning =
    false;


let webhookWorkerPromise:
    Promise<void> | null = null;


const runWebhookWorker =
    async (): Promise<void> => {

        if (
            webhookWorkerRunning
        ) {

            return;

        }


        webhookWorkerRunning =
            true;


        try {

            webhookWorkerPromise =
                DodoPaymentsService.processWebhookQueue();


            await webhookWorkerPromise;

        }

        catch (error) {

            /*
            |--------------------------------------------------------------------------
            | IMPORTANT
            |--------------------------------------------------------------------------
            |
            | A webhook-processing failure must NOT crash the HTTP server.
            |
            | The webhook remains in the database and the queue service
            | handles retry scheduling.
            |--------------------------------------------------------------------------
            */

            console.error(
                "❌ Dodo Payments webhook worker error:",
                error
            );

        }

        finally {

            webhookWorkerPromise =
                null;

            webhookWorkerRunning =
                false;

        }

    };


const startWebhookWorker =
    (): void => {

        if (
            webhookWorkerTimer
        ) {

            return;

        }


        console.log(
            `💳 Dodo Payments webhook worker started (every ${WEBHOOK_WORKER_INTERVAL_MS / 1000}s)`
        );


        /*
        |--------------------------------------------------------------------------
        | Process Existing Events Immediately
        |--------------------------------------------------------------------------
        */

        void runWebhookWorker();


        /*
        |--------------------------------------------------------------------------
        | Process Pending Events Continuously
        |--------------------------------------------------------------------------
        */

        webhookWorkerTimer =
            setInterval(

                () => {

                    void runWebhookWorker();

                },

                WEBHOOK_WORKER_INTERVAL_MS

            );


        /*
        |--------------------------------------------------------------------------
        | Do Not Keep Node Process Alive Solely Because Of This Timer
        |--------------------------------------------------------------------------
        */

        webhookWorkerTimer.unref();

    };


const stopWebhookWorker =
    async (): Promise<void> => {

        if (
            webhookWorkerTimer
        ) {

            clearInterval(
                webhookWorkerTimer
            );

            webhookWorkerTimer =
                null;

        }


        /*
        |--------------------------------------------------------------------------
        | Allow Currently Running Worker To Finish
        |--------------------------------------------------------------------------
        */

        if (
            webhookWorkerPromise
        ) {

            try {

                await Promise.race([

                    webhookWorkerPromise,

                    new Promise<void>(
                        resolve => {

                            setTimeout(
                                resolve,
                                5000
                            );

                        }
                    )

                ]);

            }

            catch (error) {

                console.error(
                    "❌ Error while stopping Dodo Payments webhook worker:",
                    error
                );

            }

        }


        console.log(
            "✅ Dodo Payments webhook worker stopped"
        );

    };


/*
|--------------------------------------------------------------------------
| HTTP Server Error
|--------------------------------------------------------------------------
*/

server.on(
    "error",
    (
        error: NodeJS.ErrnoException
    ) => {

        if (
            error.code ===
            "EADDRINUSE"
        ) {

            console.error(
                `❌ Port ${env.PORT} is already in use.`
            );

            console.error(
                "   Stop the existing process or run: npm run kill"
            );

            process.exit(1);

        }


        console.error(
            "❌ HTTP Server Error:",
            error
        );

        process.exit(1);

    }
);


/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

server.listen(
    env.PORT,
    HOST,
    () => {

        console.log("");

        console.log(
            "=============================================="
        );

        console.log(
            "🚀 AI Receptionist Backend Started"
        );

        console.log(
            "=============================================="
        );

        console.log(
            `🌐 Local URL : http://${DISPLAY_HOST}:${env.PORT}`
        );

        console.log(
            `🔌 Bind      : ${HOST}:${env.PORT}`
        );

        console.log(
            `🏥 Health    : http://${DISPLAY_HOST}:${env.PORT}/health/live`
        );

        console.log(
            `🌍 Mode      : ${env.NODE_ENV}`
        );

        console.log(
            "=============================================="
        );

        console.log("");


        /*
        |--------------------------------------------------------------------------
        | Start Background Workers
        |--------------------------------------------------------------------------
        */

        startWebhookWorker();

    }
);


/*
|--------------------------------------------------------------------------
| Graceful Shutdown
|--------------------------------------------------------------------------
*/

let shuttingDown =
    false;


const shutdown =
    async (
        signal: string
    ): Promise<void> => {

        /*
        |--------------------------------------------------------------------------
        | Prevent Multiple Shutdowns
        |--------------------------------------------------------------------------
        */

        if (
            shuttingDown
        ) {

            return;

        }


        shuttingDown =
            true;


        console.log(
            `\n${signal} received. Shutting down...`
        );


        /*
        |--------------------------------------------------------------------------
        | Stop Background Workers
        |--------------------------------------------------------------------------
        */

        await stopWebhookWorker();


        /*
        |--------------------------------------------------------------------------
        | Close HTTP Server
        |--------------------------------------------------------------------------
        */

        await new Promise<void>(
            resolve => {

                server.close(
                    (
                        error?: Error
                    ) => {

                        if (
                            error
                        ) {

                            console.error(
                                "❌ Error while closing HTTP server:",
                                error
                            );

                            resolve();

                            return;

                        }


                        console.log(
                            "✅ HTTP Server Closed"
                        );


                        resolve();

                    }
                );

            }
        );


        /*
        |--------------------------------------------------------------------------
        | Exit
        |--------------------------------------------------------------------------
        */

        process.exit(0);

    };


/*
|--------------------------------------------------------------------------
| SIGINT
|--------------------------------------------------------------------------
*/

process.once(
    "SIGINT",
    () => {

        void shutdown(
            "SIGINT"
        );

    }
);


/*
|--------------------------------------------------------------------------
| SIGTERM
|--------------------------------------------------------------------------
*/

process.once(
    "SIGTERM",
    () => {

        void shutdown(
            "SIGTERM"
        );

    }
);


/*
|--------------------------------------------------------------------------
| Unhandled Promise Rejection
|--------------------------------------------------------------------------
*/

process.on(
    "unhandledRejection",
    (
        reason: unknown
    ) => {

        console.error(
            "❌ Unhandled Promise Rejection:",
            reason
        );


        void shutdown(
            "UNHANDLED_REJECTION"
        );

    }
);


/*
|--------------------------------------------------------------------------
| Uncaught Exception
|--------------------------------------------------------------------------
*/

process.on(
    "uncaughtException",
    (
        error: Error
    ) => {

        console.error(
            "❌ Uncaught Exception:",
            error
        );


        /*
        |--------------------------------------------------------------------------
        | An uncaught exception can leave the process in an unsafe state.
        | Terminate after attempting graceful shutdown.
        |--------------------------------------------------------------------------
        */

        void shutdown(
            "UNCAUGHT_EXCEPTION"
        );

    }
);
