import {

    body,

    param

} from "express-validator";

export class BookingValidator {

    /*
    |--------------------------------------------------------------------------
    | Create Booking
    |--------------------------------------------------------------------------
    */

    static create = [

        body("client_id")

            .notEmpty()

            .withMessage("Client ID is required.")

            .isUUID()

            .withMessage("Invalid client ID."),

        body("customer_name")

            .trim()

            .notEmpty()

            .withMessage("Customer name is required.")

            .isLength({

                min: 2,

                max: 100

            })

            .withMessage(

                "Customer name must be between 2 and 100 characters."

            ),

        body("customer_phone")

            .trim()

            .notEmpty()

            .withMessage("Customer phone is required."),

        body("customer_email")

            .optional({

                nullable: true

            })

            .isEmail()

            .withMessage("Invalid email address."),

        body("service_id")

            .notEmpty()

            .withMessage("Service is required.")

            .isUUID()

            .withMessage("Invalid service ID."),

        body("appointment_date")

            .notEmpty()

            .withMessage("Appointment date is required.")

            .isISO8601()

            .withMessage("Invalid appointment date."),

        body("appointment_time")

            .notEmpty()

            .withMessage("Appointment time is required.")

            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)

            .withMessage(

                "Appointment time must be in HH:mm format."

            ),

        body("reason")

            .optional()

            .trim()

            .isLength({

                max: 500

            }),

        body("notes")

            .optional()

            .trim()

            .isLength({

                max: 1000

            })

    ];

    /*
    |--------------------------------------------------------------------------
    | Get Booking
    |--------------------------------------------------------------------------
    */

    static get = [

        param("id")

            .isUUID()

            .withMessage("Invalid booking ID.")

    ];

    /*
    |--------------------------------------------------------------------------
    | Update Booking
    |--------------------------------------------------------------------------
    */

    static update = [

        param("id")

            .isUUID()

            .withMessage("Invalid booking ID."),

        body("customer_name")

            .optional()

            .trim()

            .isLength({

                min: 2,

                max: 100

            }),

        body("customer_phone")

            .optional()

            .trim(),

        body("customer_email")

            .optional({

                nullable: true

            })

            .isEmail(),

        body("notes")

            .optional()

            .trim()

            .isLength({

                max: 1000

            }),

        body("reason")

            .optional()

            .trim()

            .isLength({

                max: 500

            })

    ];

    /*
    |--------------------------------------------------------------------------
    | Cancel Booking
    |--------------------------------------------------------------------------
    */

    static cancel = [

        param("id")

            .isUUID()

            .withMessage("Invalid booking ID.")

    ];

    /*
    |--------------------------------------------------------------------------
    | Reschedule Booking
    |--------------------------------------------------------------------------
    */

    static reschedule = [

        param("id")

            .isUUID()

            .withMessage("Invalid booking ID."),

        body("appointment_date")

            .notEmpty()

            .isISO8601()

            .withMessage("Invalid appointment date."),

        body("appointment_time")

            .notEmpty()

            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)

            .withMessage(

                "Appointment time must be in HH:mm format."

            ),

        body("service_id")

            .optional()

            .isUUID()

            .withMessage("Invalid service ID.")

    ];

    /*
    |--------------------------------------------------------------------------
    | Delete Booking
    |--------------------------------------------------------------------------
    */

    static delete = [

        param("id")

            .isUUID()

            .withMessage("Invalid booking ID.")

    ];

}