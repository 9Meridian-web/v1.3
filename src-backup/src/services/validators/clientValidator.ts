import {

    body,

    param

} from "express-validator";

export class ClientValidator {

    /*
    |--------------------------------------------------------------------------
    | Create Client
    |--------------------------------------------------------------------------
    */

    static create = [

        body("business_name")

            .trim()

            .notEmpty()

            .withMessage("Business name is required.")

            .isLength({

                min: 2,

                max: 100

            })

            .withMessage(

                "Business name must be between 2 and 100 characters."

            ),

        body("owner_name")

            .trim()

            .notEmpty()

            .withMessage("Owner name is required.")

            .isLength({

                min: 2,

                max: 100

            })

            .withMessage(

                "Owner name must be between 2 and 100 characters."

            ),

        body("email")

            .trim()

            .notEmpty()

            .withMessage("Email is required.")

            .isEmail()

            .withMessage("Invalid email address.")

            .normalizeEmail(),

        body("phone")

            .trim()

            .notEmpty()

            .withMessage("Phone number is required.")

            .isMobilePhone("any")

            .withMessage("Invalid phone number."),

        body("business_type")

            .trim()

            .notEmpty()

            .withMessage("Business type is required."),

        body("website")

            .optional()

            .trim()

            .isURL()

            .withMessage("Invalid website URL."),

        body("plan")

            .optional()

            .isIn([

                "Free",

                "Starter",

                "Professional",

                "Enterprise"

            ])

            .withMessage("Invalid subscription plan."),

        body("status")

            .optional()

            .isIn([

                "Active",

                "Inactive",

                "Suspended"

            ])

            .withMessage("Invalid client status."),

        body("locale")

            .optional()

            .trim(),

        body("time_zone")

            .optional()

            .trim(),

        body("date_format")

            .optional()

            .trim(),

        body("time_format")

            .optional()

            .isIn([

                "12h",

                "24h"

            ])

            .withMessage("Invalid time format.")

    ];

    /*
    |--------------------------------------------------------------------------
    | Get Client
    |--------------------------------------------------------------------------
    */

    static get = [

        param("id")

            .isUUID()

            .withMessage("Client ID must be a valid UUID.")

    ];

    /*
    |--------------------------------------------------------------------------
    | Update Client
    |--------------------------------------------------------------------------
    */

    static update = [

        param("id")

            .isUUID()

            .withMessage("Client ID must be a valid UUID."),

        body("business_name")

            .optional()

            .trim()

            .isLength({

                min: 2,

                max: 100

            }),

        body("owner_name")

            .optional()

            .trim()

            .isLength({

                min: 2,

                max: 100

            }),

        body("email")

            .optional()

            .isEmail()

            .normalizeEmail(),

        body("phone")

            .optional()

            .isMobilePhone("any"),

        body("website")

            .optional()

            .isURL(),

        body("plan")

            .optional()

            .isIn([

                "Free",

                "Starter",

                "Professional",

                "Enterprise"

            ]),

        body("status")

            .optional()

            .isIn([

                "Active",

                "Inactive",

                "Suspended"

            ]),

        body("time_format")

            .optional()

            .isIn([

                "12h",

                "24h"

            ])

    ];

    /*
    |--------------------------------------------------------------------------
    | Delete Client
    |--------------------------------------------------------------------------
    */

    static delete = [

        param("id")

            .isUUID()

            .withMessage("Client ID must be a valid UUID.")

    ];

}