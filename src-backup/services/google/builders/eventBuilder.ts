import { calendar_v3 } from "googleapis";

import {
    CalendarEventRequest
} from "../types/calendarTypes";

import { DateTimeHelper } from "../../../helpers/dateTimeHelper";

export class EventBuilder {

    /*
    |--------------------------------------------------------------------------
    | Build Google Calendar Event
    |--------------------------------------------------------------------------
    */

    static build(

        request: CalendarEventRequest

    ): calendar_v3.Schema$Event {

        const {

            booking,

            client

        } = request;

        /*
        |--------------------------------------------------------------------------
        | Timezone
        |--------------------------------------------------------------------------
        */

        const timezone =

            client.timezone ||

            DateTimeHelper.DEFAULT_TIMEZONE;

        /*
        |--------------------------------------------------------------------------
        | Appointment Window
        |--------------------------------------------------------------------------
        */

        const start =

            DateTimeHelper.create(

                booking.appointment_date,

                booking.appointment_time,

                timezone

            );

        DateTimeHelper.ensureValid(

            start,

            "Google Calendar Start"

        );

        const end =

            start.plus({

                minutes:

                    booking.service_duration_minutes

            });

        /*
        |--------------------------------------------------------------------------
        | Description
        |--------------------------------------------------------------------------
        */

        const description = [

            `Service : ${booking.service_name}`,

            `Price   : ${booking.service_price} ${booking.service_currency}`,

            `Customer: ${booking.customer_name}`,

            `Phone   : ${booking.customer_phone}`,

            `Email   : ${booking.customer_email ?? "-"}`,

            booking.notes

                ? `Notes   : ${booking.notes}`

                : null

        ]

            .filter(Boolean)

            .join("\n");

        /*
        |--------------------------------------------------------------------------
        | Event
        |--------------------------------------------------------------------------
        */

        return {

            summary:

                `${booking.service_name} • ${booking.customer_name}`,

            description,

            start: {

                dateTime:

                    start.toISO(),

                timeZone:

                    timezone

            },

            end: {

                dateTime:

                    end.toISO(),

                timeZone:

                    timezone

            },

            attendees:

                booking.customer_email

                    ? [

                        {

                            email:

                                booking.customer_email

                        }

                    ]

                    : [],

            reminders: {

                useDefault: true

            }

        };

    }

}