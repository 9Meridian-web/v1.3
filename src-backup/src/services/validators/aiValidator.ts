export class AIValidator {

    /*
    |--------------------------------------------------------------------------
    | Validate Confidence
    |--------------------------------------------------------------------------
    */

    static confidence(

        confidence: unknown,

        minimum: number = 0.70

    ): number {

        if (

            typeof confidence !== "number"

        ) {

            throw new Error(

                "AI response is missing a valid confidence score."

            );

        }

        if (

            confidence < minimum

        ) {

            throw new Error(

                `AI confidence (${confidence}) is below the minimum threshold (${minimum}).`

            );

        }

        if (

            confidence > 1

        ) {

            throw new Error(

                "AI confidence cannot be greater than 1."

            );

        }

        return confidence;

    }

    /*
    |--------------------------------------------------------------------------
    | Validate Required String
    |--------------------------------------------------------------------------
    */

    static required(

        value: unknown,

        field: string

    ): string {

        if (

            typeof value !== "string"

        ) {

            throw new Error(

                `${field} must be a string.`

            );

        }

        const cleaned = value.trim();

        if (

            cleaned.length === 0

        ) {

            throw new Error(

                `${field} is required.`

            );

        }

        return cleaned;

    }

    /*
    |--------------------------------------------------------------------------
    | Optional String
    |--------------------------------------------------------------------------
    */

    static optional(

        value: unknown

    ): string {

        if (

            typeof value !== "string"

        ) {

            return "";

        }

        return value.trim();

    }

    /*
    |--------------------------------------------------------------------------
    | Validate Date
    |--------------------------------------------------------------------------
    */

    static date(

        value: unknown,

        field: string

    ): string {

        const date = this.required(

            value,

            field

        );

        if (

            Number.isNaN(

                Date.parse(

                    date

                )

            )

        ) {

            throw new Error(

                `${field} is not a valid date.`

            );

        }

        return date;

    }

    /*
    |--------------------------------------------------------------------------
    | Validate Time
    |--------------------------------------------------------------------------
    */

    static time(

        value: unknown,

        field: string

    ): string {

        const time = this.required(

            value,

            field

        );

        const regex =

            /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (

            !regex.test(

                time

            )

        ) {

            throw new Error(

                `${field} must be in HH:mm format.`

            );

        }

        return time;

    }

}