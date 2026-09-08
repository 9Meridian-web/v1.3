import { ReschedulePrompt } from "../../prompts/reschedulePrompt";

import { GeminiService } from "./geminiService";

import { JsonParserService } from "../parsers/jsonParserService";

import { RescheduleBookingService } from "../booking/rescheduleBookingService";

import { BookingRepository } from "../../repositories/bookingRepository";

import { ClientService } from "../clients/clientService";

import { AppError } from "../../errors/AppError";

/*
|--------------------------------------------------------------------------
| AI Extraction
|--------------------------------------------------------------------------
*/

interface RescheduleAIExtraction {

    customer_name: string | null;

    customer_phone: string | null;

    customer_email: string | null;

    current_appointment_date: string | null;

    current_appointment_time: string | null;

    new_appointment_date: string | null;

    new_appointment_time: string | null;

    reason: string | null;

    confidence: number | null;

}

/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

export interface RescheduleAIRequest {

    clientId: string;

    message: string;

}

/*
|--------------------------------------------------------------------------
| Reschedule AI Service
|--------------------------------------------------------------------------
*/

export class RescheduleAIService {

    /*
    |--------------------------------------------------------------------------
    | Handle
    |--------------------------------------------------------------------------
    */

    static async handle(

        request: RescheduleAIRequest

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
        | Business Timezone
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

            ReschedulePrompt.build(

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

            JsonParserService.parse<RescheduleAIExtraction>(

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
        | Get Client Bookings
        |--------------------------------------------------------------------------
        */

        const bookings =

            await BookingRepository.findByClient(

                request.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Normalize Extracted Values
        |--------------------------------------------------------------------------
        */

        const customerName =

            extraction.customer_name

                ?.trim()

                .toLowerCase();

        const customerPhone =

            extraction.customer_phone

                ?.trim();

        const customerEmail =

            extraction.customer_email

                ?.trim()

                .toLowerCase();

        const currentDateValue =

            this.normalizeDate(

                extraction.current_appointment_date

            );

        const currentTimeValue =

            this.normalizeTime(

                extraction.current_appointment_time

            );

        /*
        |--------------------------------------------------------------------------
        | Find Matching Bookings
        |--------------------------------------------------------------------------
        */

        const matchingBookings =

            bookings.filter(

                booking => {

                    /*
                    |--------------------------------------------------------------------------
                    | Ignore Cancelled Bookings
                    |--------------------------------------------------------------------------
                    */

                    if (

                        booking.status ===

                        "cancelled"

                    ) {

                        return false;

                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Customer Matching
                    |--------------------------------------------------------------------------
                    */

                    const nameMatches =

                        customerName

                            ? booking.customer_name

                                .trim()

                                .toLowerCase() ===

                              customerName

                            : false;

                    const phoneMatches =

                        customerPhone

                            ? booking.customer_phone

                                .trim() ===

                              customerPhone

                            : false;

                    const emailMatches =

                        customerEmail

                            ? (

                                booking.customer_email

                                    ?.trim()

                                    .toLowerCase() ===

                                customerEmail

                            )

                            : false;

                    const customerMatches =

                        nameMatches ||

                        phoneMatches ||

                        emailMatches;

                    if (

                        !customerMatches

                    ) {

                        return false;

                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Current Date Matching
                    |--------------------------------------------------------------------------
                    */

                    if (

                        currentDateValue &&

                        this.normalizeDate(

                            booking.appointment_date

                        ) !==

                        currentDateValue

                    ) {

                        return false;

                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Current Time Matching
                    |--------------------------------------------------------------------------
                    */

                    if (

                        currentTimeValue &&

                        this.normalizeTime(

                            booking.appointment_time

                        ) !==

                        currentTimeValue

                    ) {

                        return false;

                    }

                    return true;

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
        | Multiple Bookings
        |--------------------------------------------------------------------------
        */

        if (

            matchingBookings.length > 1

        ) {

            throw new AppError(

                "Multiple matching bookings found. Please provide the current appointment date and time.",

                409

            );

        }

        const booking =

            matchingBookings[0];

        /*
        |--------------------------------------------------------------------------
        | Reschedule
        |--------------------------------------------------------------------------
        */

        return await RescheduleBookingService.reschedule({

            bookingId:

                booking.id!,

            appointment_date:

                extraction.new_appointment_date!,

            appointment_time:

                extraction.new_appointment_time!

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    private static validate(

        extraction: RescheduleAIExtraction

    ): void {

        if (

            !extraction.new_appointment_date

        ) {

            throw new AppError(

                "New appointment date is required.",

                400

            );

        }

        if (

            !extraction.new_appointment_time

        ) {

            throw new AppError(

                "New appointment time is required.",

                400

            );

        }

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