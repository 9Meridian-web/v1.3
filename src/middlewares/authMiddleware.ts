import {

    Request,

    Response,

    NextFunction

} from "express";

import { JwtHelper } from "../helpers/jwt";

import { AppError } from "../errors/AppError";

/*
|--------------------------------------------------------------------------
| Authentication Middleware
|--------------------------------------------------------------------------
*/

export function authMiddleware(

    req: Request,

    _res: Response,

    next: NextFunction

): void {

    try {

        /*
        |--------------------------------------------------------------------------
        | Authorization Header
        |--------------------------------------------------------------------------
        */

        const authorization =

            req.headers.authorization;

        if (

            !authorization

        ) {

            throw new AppError(

                "Authorization header is missing.",

                401

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Bearer Token
        |--------------------------------------------------------------------------
        */

        const [

            scheme,

            token

        ] = authorization.split(" ");

        if (

            scheme !== "Bearer" ||

            !token

        ) {

            throw new AppError(

                "Invalid authorization header.",

                401

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Verify JWT
        |--------------------------------------------------------------------------
        */

        const payload =

            JwtHelper.verify(

                token

            );

        /*
        |--------------------------------------------------------------------------
        | Attach User
        |--------------------------------------------------------------------------
        */

        req.user = {

            userId:

                payload.userId,

            clientId:

                payload.clientId,

            role:

                payload.role

        };

        /*
        |--------------------------------------------------------------------------
        | Development Log
        |--------------------------------------------------------------------------
        */

        if (

            process.env.NODE_ENV !== "production"

        ) {

        }

        next();

    }

    catch (error) {

        if (

            error instanceof AppError

        ) {

            return next(error);

        }

        return next(

            new AppError(

                "Invalid or expired authentication token.",

                401

            )

        );

    }

}