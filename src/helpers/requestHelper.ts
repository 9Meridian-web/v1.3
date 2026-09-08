import { Request } from "express";

import { AppError } from "../errors/AppError";

export class RequestHelper {

    /*
    |--------------------------------------------------------------------------
    | Authenticated Client ID
    |--------------------------------------------------------------------------
    */

    static clientId(

        req: Request

    ): string {

        const clientId =
            req.user?.clientId;

        if (!clientId) {
            throw new AppError(
                "Authenticated client ID is missing.",
                401
            );
        }

        return clientId;

    }

    /*
    |--------------------------------------------------------------------------
    | Route Parameter
    |--------------------------------------------------------------------------
    */

    static getParam(

        req: Request,

        key: string

    ): string {

        const value = req.params[key];

        if (!value) {
            throw new AppError(
                `Missing route parameter: ${key}`,
                400
            );
        }

        return String(value);

    }

}
