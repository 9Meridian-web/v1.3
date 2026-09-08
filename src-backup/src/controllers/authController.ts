import {

    NextFunction,
    Request,

    RequestHandler,

    Response

} from "express";

import { AuthService } from "../services/authService";
import { ValidationChain } from "express-validator";

export class AuthController {
    static changePassword(arg0: string, authMiddleware: (req: Request, _res: Response, next: NextFunction) => void, changePassword: (arg0: string, authMiddleware: (req: Request, _res: Response, next: NextFunction) => void, changePassword: any, validationMiddleware: (validators: ValidationChain[]) => RequestHandler, changePassword1: any) => void, validationMiddleware: (validators: ValidationChain[]) => RequestHandler, changePassword1: any) {
        throw new Error("Method not implemented.");
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