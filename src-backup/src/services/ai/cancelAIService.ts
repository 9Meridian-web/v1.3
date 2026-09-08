import { CancelPrompt } from "../../prompts/cancelPrompt";

import { GeminiService } from "./geminiService";

import { JsonParserService } from "../parsers/jsonParserService";

import { CancelBookingService } from "../booking/cancelBookingService";

import { BookingRepository } from "../../repositories/bookingRepository";

import { ClientService } from "../clients/clientService";

import { AppError } from "../../errors/AppError";

/*
|--------------------------------------------------------------------------
| AI Extraction
|--------------------------------------------------------------------------
*/

interface CancelAIExtraction {

    customer_name: string | null;

    customer_phone: string | null;

    customer_email: string | null;

    appointment_date: string | null;

    appointment_time: string | null;

    reason: string | null;

    confidence?: number;

}

/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

export interface CancelAIRequest {

    clientId: string;

    message: string;

}

/*
|--------------------------------------------------------------------------
| Cancel AI Service
|--------------------------------------------------------------------------
*/

export class CancelAIService {

    /*
    |--------------------------------------------------------------------------
    | Handle
    |--------------------------------------------------------------------------
    */

    static async handle(

        request: CancelAIRequest

    ): Promise<unknown> {

        /*
        |--------------------------------------------------------------------------
        | Client
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

            CancelPrompt.build(

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

        const extraction =

            JsonParserService.parse<CancelAIExtraction>(

                response

            );

        /*
        |--------------------------------------------------------------------------
        | Validate
        |--------------------------------------------------------------------------
        */

        this.validate(

            extraction

        );

        /*
        |--------------------------------------------------------------------------
        | Find Client Bookings
        |--------------------------------------------------------------------------
        */

        const bookings =

            await BookingRepository.findByClient(

                request.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Normalize Search Values
        |--------------------------------------------------------------------------
        */

        const customerName =

            extraction.customer_name

                ?.trim()

                .toLowerCase();

        const appointmentDate =

            this.normalizeDate(

                extraction.appointment_date

            );

        const appointmentTime =

            this.normalizeTime(

                extraction.appointment_time

            );

        /*
        |--------------------------------------------------------------------------
        | Find Matching Booking
        |--------------------------------------------------------------------------
        */

        const matchingBookings =

            bookings.filter(

                booking => {

                    const sameCustomer =

                        !customerName

                            ? true

                            :

                        booking.customer_name

                            .trim()

                            .toLowerCase() ===

                        customerName;

                    const sameDate =

                        this.normalizeDate(

                            booking.appointment_date

                        ) ===

                        appointmentDate;

                    const sameTime =

                        this.normalizeTime(

                            booking.appointment_time

                        ) ===

                        appointmentTime;

                    const activeBooking =

                        booking.status !==

                        "cancelled";

                    return (

                        sameCustomer &&

                        sameDate &&

                        sameTime &&

                        activeBooking

                    );

                }

            );

        /*
        |--------------------------------------------------------------------------
        | Booking Not Found
        |--------------------------------------------------------------------------
        */

        if (

            matchingBookings.length === 0

        ) {

            throw new AppError(

                "Booking not found.",

                404

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Ambiguous Booking
        |--------------------------------------------------------------------------
        */

        if (

            matchingBookings.length > 1

        ) {

            throw new AppError(

                "Multiple matching bookings found. Please provide more appointment details.",

                409

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Cancel Booking
        |--------------------------------------------------------------------------
        */

        return await CancelBookingService.cancel({

            bookingId:

                matchingBookings[0].id!

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    private static validate(

        extraction: CancelAIExtraction

    ): void {

        if (

            !extraction.customer_name &&

            !extraction.customer_phone &&

            !extraction.customer_email

        ) {

            throw new AppError(

                "Customer name, phone, or email is required.",

                400

            );

        }

        if (

            !extraction.appointment_date

        ) {

            throw new AppError(

                "Appointment date is required.",

                400

            );

        }

        if (

            !extraction.appointment_time

        ) {

            throw new AppError(

                "Appointment time is required.",

                400

            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Date
    |--------------------------------------------------------------------------
    */

    private static normalizeDate(

        value: string | null | undefined

    ): string {

        if (

            !value

        ) {

            return "";

        }

        const trimmed =

            value.trim();

        if (

            /^\d{4}-\d{2}-\d{2}$/.test(

                trimmed

            )

        ) {

            return trimmed;

        }

        const parsed =

            new Date(

                trimmed

            );

        if (

            Number.isNaN(

                parsed.getTime()

            )

        ) {

            return trimmed;

        }

        return [

            parsed.getUTCFullYear(),

            String(

                parsed.getUTCMonth() + 1

            ).padStart(

                2,

                "0"

            ),

            String(

                parsed.getUTCDate()

            ).padStart(

                2,

                "0"

            )

        ].join("-");

    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Time
    |--------------------------------------------------------------------------
    */

    private static normalizeTime(

        value: string | null | undefined

    ): string {

        if (

            !value

        ) {

            return "";

        }

        const trimmed =

            value.trim();

        const match =

            trimmed.match(

                /^(\d{1,2}):(\d{2})(?::\d{2})?$/

            );

        if (

            match

        ) {

            return (

                `${match[1].padStart(2, "0")}:${match[2]}`

            );

        }

        return trimmed;

    }

}