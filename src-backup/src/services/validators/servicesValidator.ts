import { body, param } from "express-validator";

/*
|--------------------------------------------------------------------------
| Service Validators
|--------------------------------------------------------------------------
*/

export class ServicesValidator {

    /*
    |--------------------------------------------------------------------------
    | Create Service
    |--------------------------------------------------------------------------
    */

    static create = [

        body("name")

            .trim()

            .notEmpty()

            .withMessage("Service name is required.")

            .isLength({

                max: 100

            })

            .withMessage(

                "Service name must not exceed 100 characters."

            ),

        body("description")

            .optional()

            .isString()

            .withMessage(

                "Description must be a string."

            ),

        body("category")

            .optional()

            .isString()

            .withMessage(

                "Category must be a string."

            ),

        body("duration")

            .isInt({

                min: 5,

                max: 480

            })

            .withMessage(

                "Duration must be between 5 and 480 minutes."

            ),

        body("price")

            .isFloat({

                min: 0

            })

            .withMessage(

                "Price must be zero or greater."

            ),

        body("currency")

            .trim()

            .notEmpty()

            .withMessage(

                "Currency is required."

            )

            .isLength({

                min: 3,

                max: 3

            })

            .withMessage(

                "Currency must be a 3-letter ISO code."

            ),

        body("active")

            .optional()

            .isBoolean()

            .withMessage(

                "Active must be a boolean."

            ),

        body("online_booking")

            .optional()

            .isBoolean()

            .withMessage(

                "Online booking must be a boolean."

            )

    ];

    /*
    |--------------------------------------------------------------------------
    | Update Service
    |--------------------------------------------------------------------------
    */

    static update = [

        param("id")

            .isUUID()

            .withMessage(

                "Invalid service ID."

            ),

        body("name")

            .optional()

            .trim()

            .isLength({

                max: 100

            }),

        body("description")

            .optional()

            .isString(),

        body("category")

            .optional()

            .isString(),

        body("duration")

            .optional()

            .isInt({

                min: 5,

                max: 480

            }),

        body("price")

            .optional()

            .isFloat({

                min: 0

            }),

        body("currency")

            .optional()

            .isLength({

                min: 3,

                max: 3

            }),

        body("active")

            .optional()

            .isBoolean(),

        body("online_booking")

            .optional()

            .isBoolean()

    ];

    /*
    |--------------------------------------------------------------------------
    | Get/Delete Service
    |--------------------------------------------------------------------------
    */

    static byId = [

        param("id")

            .isUUID()

            .withMessage(

                "Invalid service ID."

            )

    ];

}