import {

    body,

    param

} from "express-validator";

export class BusinessSettingsValidator {

    /*
    |--------------------------------------------------------------------------
    | Create Business Settings
    |--------------------------------------------------------------------------
    */

    static create = [

        body("client_id")

            .notEmpty()

            .withMessage("Client ID is required.")

            .isUUID()

            .withMessage("Client ID must be a valid UUID."),

        body("appointment_duration")

            .isInt({

                min: 5,

                max: 480

            })

            .withMessage(

                "Appointment duration must be between 5 and 480 minutes."

            ),

        body("buffer_minutes")

            .isInt({

                min: 0,

                max: 120

            })

            .withMessage(

                "Buffer time must be between 0 and 120 minutes."

            ),

        body("opening_time")

            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)

            .withMessage(

                "Opening time must be in HH:mm format."

            ),

        body("closing_time")

            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)

            .withMessage(

                "Closing time must be in HH:mm format."

            ),

        body("working_days")

            .isArray({

                min: 1

            })

            .withMessage(

                "Working days must be a non-empty array."

            )

    ];

    /*
    |--------------------------------------------------------------------------
    | Get Business Settings
    |--------------------------------------------------------------------------
    */

    static get = [

        param("clientId")

            .isUUID()

            .withMessage("Client ID must be a valid UUID.")

    ];

    /*
    |--------------------------------------------------------------------------
    | Update Business Settings
    |--------------------------------------------------------------------------
    */

    static update = [

        param("clientId")

            .isUUID()

            .withMessage("Client ID must be a valid UUID."),

        body("appointment_duration")

            .optional()

            .isInt({

                min: 5,

                max: 480

            }),

        body("buffer_minutes")

            .optional()

            .isInt({

                min: 0,

                max: 120

            }),

        body("opening_time")

            .optional()

            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

        body("closing_time")

            .optional()

            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

        body("working_days")

            .optional()

            .isArray({

                min: 1

            })

    ];

}