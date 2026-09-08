import {
    Request,
    Response,
    NextFunction,
    RequestHandler
} from "express";

import {
    validationResult,
    ValidationChain
} from "express-validator";

export function validationMiddleware(
    validators: ValidationChain[]
): RequestHandler {

    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        await Promise.all(
            validators.map(v => v.run(req))
        );

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            res.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: errors.array()

            });

            return;

        }

        next();

    };

}