import {

    NextFunction,
    Request,

    RequestHandler,

    Response

} from "express";

import { AuthService } from "../services/authService";
import { GoogleIdentityService } from "../services/googleIdentityService";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ValidationChain } from "express-validator";

export class AuthController {
    static async google(req: Request, res: Response): Promise<void> {
        const identity = await GoogleIdentityService.verifyCredential(req.body?.credential);

        // The public website uses this verified identity for its own UI. Tenant
        // dashboard tokens continue to be issued only by the owner login flow.
        res.status(200).json({
            success: true,
            data: {
                // Do not return or persist Google's ID token in browser storage.
                // This public-site session is deliberately not a tenant API token.
                token: jwt.sign(
                    { scope: "website", sub: identity.sub, email: identity.email },
                    env.JWT_SECRET,
                    { expiresIn: "1h", audience: "9meridian-website" },
                ),
                user: identity,
                exp: Math.floor(Date.now() / 1000) + 3_600,
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Register
    |--------------------------------------------------------------------------
    */

    static async register(

        req: Request,

        res: Response

    ): Promise<void> {

        const result =
            await AuthService.register(

                req.body

            );

        res.status(201).json({

            success: true,

            message: "User registered successfully.",

            data: result

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Login
    |--------------------------------------------------------------------------
    */

    static async login(

        req: Request,

        res: Response

    ): Promise<void> {

        const result =
            await AuthService.login(

                req.body

            );

        res.status(200).json({

            success: true,

            message: "Login successful.",

            data: result

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Current User
    |--------------------------------------------------------------------------
    */

    static async getCurrentUser(

        req: Request,

        res: Response

    ): Promise<void> {

        const user =
            await AuthService.getCurrentUser(

                req.user.userId

            );

        res.status(200).json({

            success: true,

            data: user

        });

    }

}
