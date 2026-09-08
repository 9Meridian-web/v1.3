import * as chrono from "chrono-node";
import { DateTime } from "luxon";

export class DateParser {

    /*
    |--------------------------------------------------------------------------
    | Parse Natural Language Date
    |--------------------------------------------------------------------------
    */

    static parse(

        input: string,

        timezone: string

    ): string {

        if (!input || !input.trim()) {

            throw new Error("Appointment date is required.");

        }

        /*
        |--------------------------------------------------------------------------
        | Current time in client's timezone
        |--------------------------------------------------------------------------
        */

        const now = DateTime.now().setZone(timezone);

        /*
        |--------------------------------------------------------------------------
        | Parse using Chrono
        |--------------------------------------------------------------------------
        */

        const parsed = chrono.parseDate(

            input,

            now.toJSDate()

        );

        if (!parsed) {

            throw new Error(

                `Unable to understand appointment date: "${input}".`

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Convert parsed date into client's timezone
        |--------------------------------------------------------------------------
        */

        const clientDate = DateTime

            .fromJSDate(parsed)

            .setZone(

                timezone,

                {

                    keepLocalTime: true

                }

            );

        if (!clientDate.isValid) {

            throw new Error("Invalid appointment date.");

        }

        /*
        |--------------------------------------------------------------------------
        | Prevent booking in the past
        |--------------------------------------------------------------------------
        */

        if (clientDate <= now) {

            throw new Error(

                "Appointment date must be in the future."

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Store in UTC
        |--------------------------------------------------------------------------
        */

        return clientDate

            .toUTC()

            .toISO()!;

    }

}