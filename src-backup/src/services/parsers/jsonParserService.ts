export class JsonParserService {

    /*
    |--------------------------------------------------------------------------
    | Parse JSON
    |--------------------------------------------------------------------------
    */

    static parse<T>(

        content: string

    ): T {

        try {

            return JSON.parse(

                this.clean(

                    content

                )

            ) as T;

        }

        catch (

            error

        ) {

            throw new Error(

                "AI returned an invalid JSON response."

            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Clean AI Response
    |--------------------------------------------------------------------------
    */

    private static clean(

        content: string

    ): string {

        return content

            .trim()

            .replace(/^```json/i, "")

            .replace(/^```/, "")

            .replace(/```$/, "")

            .trim();

    }

}