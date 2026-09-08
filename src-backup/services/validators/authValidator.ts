import { Request, Response, NextFunction, RequestHandler } from "express";
import { body, ValidationChain } from "express-validator";

export class AuthValidator {
    static changePassword(arg0: string, authMiddleware: (req: Request, _res: Response, next: NextFunction) => void, changePassword: any, validationMiddleware: (validators: ValidationChain[]) => RequestHandler, changePassword1: any) {
        throw new Error("Method not implemented.");
    }

    /*
    |--------------------------------------------------------------------------
    | Register
    |--------------------------------------------------------------------------
    */

    static register = [

        body("client_id")

            .trim()

            .notEmpty()

            .withMessage("Client ID is required.")

            .isUUID()

            .withMessage("Client ID must be a valid UUID."),

        body("name")

            .trim()

            .notEmpty()

            .withMessage("Name is required.")

            .isLength({

                min: 2,

                max: 100

            })

            .withMessage(

                "Name must be between 2 and 100 characters."

            ),

        body("email")

            .trim()

            .notEmpty()

            .withMessage("Email is required.")

            .isEmail()

            .withMessage("Please provide a valid email.")

            .normalizeEmail(),

        body("password")

            .notEmpty()

            .withMessage("Password is required.")

            .isLength({

                min: 8

            })

            .withMessage(

                "Password must be at least 8 characters long."

            )

            .matches(/[A-Z]/)

            .withMessage(

                "Password must contain at least one uppercase letter."

            )

            .matches(/[a-z]/)

            .withMessage(

                "Password must contain at least one lowercase letter."

            )

            .matches(/[0-9]/)

            .withMessage(

                "Password must contain at least one number."

            )

            .matches(/[!@#$%^&*(),.?":{}|<>]/)

            .withMessage(

                "Password must contain at least one special character."

            ),

        body("role")

            .optional()

            .isIn([

                "Owner",

                "Admin",

                "Receptionist"

            ])

            .withMessage("Invalid role.")

    ];

    /*
    |--------------------------------------------------------------------------
    | Login
    |--------------------------------------------------------------------------
    */

    static login = [

        body("email")

            .trim()

            .notEmpty()

            .withMessage("Email is required.")

            .isEmail()

            .withMessage("Please provide a valid email.")

            .normalizeEmail(),

        body("password")

            .notEmpty()

            .withMessage("Password is required.")

    ];

}