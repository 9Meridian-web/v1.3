import {

    NextFunction,
    Request,

    RequestHandler,

    Response

} from "express";

import { AuthService } from "../services/authService";
import { GoogleIdentityService } from "../services/googleIdentityService";
import { ValidationChain } from "express-validator";

export class AuthController {
    static async google(req: Request, res: Response): Promise<void> {
        const identity = await GoogleIdentityService.verifyCredential(req.body?.credential);

        // The public website uses this verified identity for its own UI. Tenant
        // dashboard tokens continue to be issued only by the owner login flow.
        res.status(200).json({
            success: true,
            data: { token: req.body.credential, user: identity, exp: identity.exp }
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
