import { DateTime } from "luxon";

export class DateTimeHelper {

    /*
    |--------------------------------------------------------------------------
    | Default Timezone
    |--------------------------------------------------------------------------
    */

    static readonly DEFAULT_TIMEZONE = "Etc/UTC";
    /*
    |--------------------------------------------------------------------------
    | Resolve Timezone
    |--------------------------------------------------------------------------
    */

    static resolveTimezone(

        timezone?: string

    ): string {

        return (

            timezone && timezone.trim().length > 0

        )

            ? timezone

            : this.DEFAULT_TIMEZONE;

    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Date
    |--------------------------------------------------------------------------
    */

    static normalizeDate(

        date: string

    ): string {

        return date.split("T")[0];

    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Time
    |--------------------------------------------------------------------------
    */

    static normalizeTime(

        time: string

    ): string {

        const value = time.trim();

        const formats = [

            /^\d{1,2}:\d{2}$/,

            /^\d{1,2}:\d{2}:\d{2}$/

        ];

        for (const format of formats) {

            if (format.test(value)) {

                const parts = value.split(":");

                const hour = parts[0].padStart(2, "0");

                const minute = parts[1];

                const second =

                    parts.length === 3

                        ? parts[2]

                        : "00";

                return `${hour}:${minute}:${second}`;

            }

        }

        throw new Error(

            `Invalid time format: ${time}`

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Create DateTime
    |--------------------------------------------------------------------------
    */

     static create(

    date: string,

    time: string,

    timezone?: string

): DateTime {

    const zone =

        this.resolveTimezone(

            timezone

        );

    const normalizedDate =

        this.normalizeDate(

            date

        );

    const normalizedTime =

        this.normalizeTime(

            time

        );

    return DateTime.fromFormat(

        `${normalizedDate} ${normalizedTime}`,

        "yyyy-MM-dd HH:mm:ss",

        {

            zone,

            setZone: true

        }

    );

}

    /*
    |--------------------------------------------------------------------------
    | Parse ISO
    |--------------------------------------------------------------------------
    */

    static parse(

        value: string,

        timezone?: string

    ): DateTime {

        return DateTime.fromISO(

            value,

            {

                zone:

                    this.resolveTimezone(

                        timezone

                    )

            }

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    static isValid(

        dateTime: DateTime

    ): boolean {

        return dateTime.isValid;

    }

    /*
    |--------------------------------------------------------------------------
    | Ensure Valid
    |--------------------------------------------------------------------------
    */

    static ensureValid(

        dateTime: DateTime,

        context?: string

    ): void {

        if (

            dateTime.isValid

        ) {

            return;

        }

        throw new Error(

            context

                ? `Invalid DateTime (${context}): ${dateTime.invalidReason}`

                : `Invalid DateTime: ${dateTime.invalidReason}`

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Weekday
    |--------------------------------------------------------------------------
    */

    static getWeekday(

    date: string,

    timezone?: string

): string {

    const zone =

        this.resolveTimezone(

            timezone

        );

    const normalizedDate =

        this.normalizeDate(

            date

        );

    const dt =

        DateTime.fromFormat(

            normalizedDate,

            "yyyy-MM-dd",

            {

                zone,

                setZone: true

            }

        );

    this.ensureValid(

        dt,

        "weekday"

    );

    return dt.toFormat(

        "cccc"

    );

}
}