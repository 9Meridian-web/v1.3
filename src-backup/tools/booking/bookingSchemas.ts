export const BookingSchemas = {

    /*
    |--------------------------------------------------------------------------
    | Create Booking
    |--------------------------------------------------------------------------
    */

    create: {

        type: "object",

        properties: {

            customer_name: {

                type: "string",

                description:

                    "Customer's full name."

            },

            customer_phone: {

                type: "string",

                description:

                    "Customer phone number."

            },

            customer_email: {

                type: "string",

                description:

                    "Customer email address.",

                nullable: true

            },

            service_name: {

                type: "string",

                description:

                    "Name of the requested service."

            },

            appointment_date: {

                type: "string",

                description:

                    "Appointment date in YYYY-MM-DD format."

            },

            appointment_time: {

                type: "string",

                description:

                    "Appointment time in HH:mm format."

            },

            reason: {

                type: "string",

                description:

                    "Reason for the appointment.",

                nullable: true

            },

            notes: {

                type: "string",

                description:

                    "Additional notes.",

                nullable: true

            }

        },

        required: [

            "customer_name",

            "customer_phone",

            "service_name",

            "appointment_date",

            "appointment_time"

        ]

    },

    /*
    |--------------------------------------------------------------------------
    | Cancel Booking
    |--------------------------------------------------------------------------
    */

    cancel: {

        type: "object",

        properties: {

            customer_name: {

                type: "string"

            },

            appointment_date: {

                type: "string"

            },

            appointment_time: {

                type: "string"

            }

        },

        required: [

            "customer_name"

        ]

    },

    /*
    |--------------------------------------------------------------------------
    | Reschedule Booking
    |--------------------------------------------------------------------------
    */

    reschedule: {

        type: "object",

        properties: {

            customer_name: {

                type: "string"

            },

            appointment_date: {

                type: "string"

            },

            appointment_time: {

                type: "string"

            },

            new_date: {

                type: "string"

            },

            new_time: {

                type: "string"

            },

            service_name: {

                type: "string"

            }

        },

        required: [

            "customer_name",

            "new_date",

            "new_time"

        ]

    }

} as const;