import { BookingPrompt } from "../../prompts/bookingPrompt";

import { GeminiService } from "./geminiService";

import { JsonParserService } from "../parsers/jsonParserService";

import { BookingTool } from "../../tools/booking/bookingTool";

import { AppError } from "../../errors/AppError";

import { ClientService } from "../clients/clientService";

/*
|--------------------------------------------------------------------------
| AI Extraction
|--------------------------------------------------------------------------
*/

interface BookingAIExtraction {

    customer_name: string | null;

    customer_phone: string | null;

    customer_email: string | null;

    service_name: string | null;

    appointment_date: string | null;

    appointment_time: string | null;

    reason: string | null;

    notes: string | null;

}

/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

export interface BookingAIRequest {

    clientId: string;

    message: string;

}

/*
|--------------------------------------------------------------------------
| Booking AI Service
|--------------------------------------------------------------------------
*/

export class BookingAIService {

    /*
    |--------------------------------------------------------------------------
    | Handle
    |--------------------------------------------------------------------------
    */

    static async handle(

        request: BookingAIRequest

    ): Promise<unknown> {

        /*
        |--------------------------------------------------------------------------
        | Load Client
        |--------------------------------------------------------------------------
        */

        const client =

            await ClientService.get(

                request.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Timezone
        |--------------------------------------------------------------------------
        */

        const timezone =

            client.timezone ||

            "UTC";

        /*
        |--------------------------------------------------------------------------
        | Current Business Date
        |--------------------------------------------------------------------------
        */

        const currentDate =

            new Intl.DateTimeFormat(

                "en-CA",

                {

                    timeZone: timezone,

                    year: "numeric",

                    month: "2-digit",

                    day: "2-digit"

                }

            ).format(

                new Date()

            );

        /*
        |--------------------------------------------------------------------------
        | Build Prompt
        |--------------------------------------------------------------------------
        */

        const prompt =

            BookingPrompt.build(

                request.message,

                currentDate,

                timezone

            );

        /*
        |--------------------------------------------------------------------------
        | Gemini
        |--------------------------------------------------------------------------
        */

        const response =

            await GeminiService.generate({

                prompt,

                temperature: 0.1

            });

        /*
        |--------------------------------------------------------------------------
        | Parse
        |--------------------------------------------------------------------------
        */

        const booking =

            JsonParserService.parse<BookingAIExtraction>(

                response

            );

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        this.validate(

            booking

        );

        /*
        |--------------------------------------------------------------------------
        | Booking Tool
        |--------------------------------------------------------------------------
        */

        return await BookingTool.execute({

            clientId:

                request.clientId,

            customer_name:

                booking.customer_name!,

            customer_phone:

                booking.customer_phone!,

            customer_email:

                booking.customer_email ?? undefined,

            service_name:

                booking.service_name!,

            appointment_date:

                booking.appointment_date!,

            appointment_time:

                booking.appointment_time!,

            reason:

                booking.reason ?? undefined,

            notes:

                booking.notes ?? undefined

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    private static validate(

        booking: BookingAIExtraction

    ): void {

        if (

            !booking.customer_name

        ) {

            throw new AppError(

                "Customer name is missing.",

                400

            );

        }

        if (

            !booking.customer_phone

        ) {

            throw new AppError(

                "Customer phone is missing.",

                400

            );

        }

        if (

            !booking.service_name

        ) {

            throw new AppError(

                "Service name is missing.",

                400

            );

        }

        if (

            !booking.appointment_date

        ) {

            throw new AppError(

                "Appointment date is missing.",

                400

            );

        }

        if (

            !booking.appointment_time

        ) {

            throw new AppError(

                "Appointment time is missing.",

                400

            );

        }

    }

}