import { Client } from "../types/client";

export class DateFormatter {

    /*
    |--------------------------------------------------------------------------
    | Format Date
    |--------------------------------------------------------------------------
    */

    static format(

        date: string | Date,

        client: Client

    ): string {

        const dateStyle =

            this.getDateStyle(

                client.date_format

            );

        return new Intl.DateTimeFormat(

            client.locale,

            {

                dateStyle,

                timeStyle: "short",

                hour12:

                    client.time_format === "12h",

                timeZone:

                    client.timezone

            }

        ).format(

            new Date(

                date

            )

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Date Style Mapper
    |--------------------------------------------------------------------------
    */

    private static getDateStyle(

        format: Client["date_format"]

    ): "short" | "medium" | "long" {

        switch (

            format

        ) {

            case "short":

                return "short";

            case "long":

                return "long";

            case "medium":

            default:

                return "medium";

        }

    }

}