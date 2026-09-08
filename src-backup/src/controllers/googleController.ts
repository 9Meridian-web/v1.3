import {
    Request,
    Response
} from "express";

import { GoogleService } from "../services/google/googleService";
import { AppError } from "../errors/AppError";

export class GoogleController {

    /*
    |--------------------------------------------------------------------------
    | Connect Google
    |--------------------------------------------------------------------------
    */

    static async connect(

        req: Request,

        res: Response

    ): Promise<void> {

        const clientId =
            req.user.clientId;

        const url =
            GoogleService.getConnectUrl(
                clientId
            );

        res.status(200).json({

            success: true,

            message: "Google authorization URL generated successfully.",

            data: {

                authorization_url: url

            }

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Google Callback
    |--------------------------------------------------------------------------
    */

    static async callback(

        req: Request,

        res: Response

    ): Promise<void> {

        const code =
            req.query.code as string;

        const clientId =
            req.query.state as string;

        if (!code) {

            throw new AppError(

                "Authorization code not found.",

                400

            );

        }

        if (!clientId) {

            throw new AppError(

                "Client ID not found.",

                400

            );

        }

        await GoogleService.handleCallback(

            code,

            clientId

        );

        res.status(200).json({

            success: true,

            message: "Google account connected successfully.",

            data: {

                connected: true

            }

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Google Connection Status
    |--------------------------------------------------------------------------
    */

    static async status(

        req: Request,

        res: Response

    ): Promise<void> {

        const status =
            await GoogleService.getStatus(

                req.user.clientId

            );

        res.status(200).json({

            success: true,

            data: status

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Disconnect Google
    |--------------------------------------------------------------------------
    */

    static async disconnect(

        req: Request,

        res: Response

    ): Promise<void> {

        await GoogleService.disconnect(

            req.user.clientId

        );

        res.status(200).json({

            success: true,

            message: "Google account disconnected successfully."

        });

    }

}