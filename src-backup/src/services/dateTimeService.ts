import * as chrono from "chrono-node";

import { DateTime } from "luxon";

export interface ParsedDateTime {

    success: boolean;

    date: string;

    time: string;

    timezone: string;

    startDateTime: string;

    endDateTime: string;

    durationMinutes: number;

    message?: string;

}

export class DateTimeService {

    /*
    |--------------------------------------------------------------------------
    | Parse Appointment
    |--------------------------------------------------------------------------
    */

    static parse(

        input: string,

        timezone = "Asia/Kolkata",

        durationMinutes = 30

    ): ParsedDateTime {

        const result = chrono.parseDate(input);

        if (!result) {

            return {

                success: false,

                message: "Unable to understand the appointment date and time.",

                date: "",

                time: "",

                timezone,

                startDateTime: "",

                endDateTime: "",

                durationMinutes

            };

        }

        const start = DateTime

            .fromJSDate(result)

            .setZone(timezone);

        const end = start.plus({

            minutes: durationMinutes

        });

        return {

            success: true,

            date: start.toISODate()!,

            time: start.toFormat("hh:mm a"),

            timezone,

            startDateTime: start.toISO()!,

            endDateTime: end.toISO()!,

            durationMinutes

        };

    }

}