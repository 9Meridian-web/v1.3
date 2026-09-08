import { CancelPrompt } from "../../prompts/cancelPrompt";

import { GeminiService } from "./geminiService";

import { JsonParserService } from "../parsers/jsonParserService";

import {
    CancelBookingService
} from "../booking/cancelBookingService";

import {
    BookingRepository
} from "../../repositories/bookingRepository";

import {
    ClientService
} from "../clients/clientService";

import { AppError } from "../../errors/AppError";

import { Booking } from "../../types/booking";


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
    ): Promise<Booking> {


        /*
        |--------------------------------------------------------------------------
        | Validate Request
        |--------------------------------------------------------------------------
        */

        this.validateRequest(
            request
        );


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
                    timeZone:
                        timezone,

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit"
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
        | Parse AI Response
        |--------------------------------------------------------------------------
        */

        const extraction =
            JsonParserService.parse<
                CancelAIExtraction
            >(
                response
            );


        /*
        |--------------------------------------------------------------------------
        | Validate Extraction
        |--------------------------------------------------------------------------
        */

        this.validateExtraction(
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
        | Normalize Search Values
        |--------------------------------------------------------------------------
        */

        const customerName =
            this.normalizeName(
                extraction.customer_name
            );

        const customerPhone =
            this.normalizePhone(
                extraction.customer_phone
            );

        const customerEmail =
            this.normalizeEmail(
                extraction.customer_email
            );

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
        | Find Matching Bookings
        |--------------------------------------------------------------------------
        |
        | We deliberately match using ALL information that the customer
        | actually supplied.
        |
        | At least one customer identifier is required.
        |
        |--------------------------------------------------------------------------
        */

        const matchingBookings =
            bookings.filter(
                booking => {

                    /*
                    |--------------------------------------------------------------------------
                    | Only Active Bookings
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
                    | Appointment Date
                    |--------------------------------------------------------------------------
                    */

                    const sameDate =
                        this.normalizeDate(
                            booking.appointment_date
                        ) ===
                        appointmentDate;


                    if (!sameDate) {
                        return false;
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | Appointment Time
                    |--------------------------------------------------------------------------
                    */

                    const sameTime =
                        this.normalizeTime(
                            booking.appointment_time
                        ) ===
                        appointmentTime;


                    if (!sameTime) {
                        return false;
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | Customer Identity
                    |--------------------------------------------------------------------------
                    |
                    | If multiple identifiers are supplied, ALL supplied
                    | identifiers must match.
                    |
                    |--------------------------------------------------------------------------
                    */

                    const identityMatches =
                        this.matchesCustomer(
                            booking,
                            {
                                name:
                                    customerName,

                                phone:
                                    customerPhone,

                                email:
                                    customerEmail
                            }
                        );


                    return identityMatches;

                }
            );


        /*
        |--------------------------------------------------------------------------
        | Booking Not Found
        |--------------------------------------------------------------------------
        */

        if (
            matchingBookings.length ===
            0
        ) {

            throw new AppError(
                "No matching active appointment was found. Please check the customer details, appointment date, and appointment time.",
                404
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Ambiguous Booking
        |--------------------------------------------------------------------------
        */

        if (
            matchingBookings.length >
            1
        ) {

            throw new AppError(
                "Multiple matching appointments were found. Please provide another customer identifier such as your phone number or email.",
                409
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Final Booking
        |--------------------------------------------------------------------------
        */

        const booking =
            matchingBookings[0];


        if (
            !booking.id
        ) {

            throw new AppError(
                "The matching appointment does not have a valid booking ID.",
                500
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Cancel
        |--------------------------------------------------------------------------
        */

        return await CancelBookingService.cancel({

            clientId:
                request.clientId,

            bookingId:
                booking.id

        });

    }


    /*
    |--------------------------------------------------------------------------
    | Validate Request
    |--------------------------------------------------------------------------
    */

    private static validateRequest(
        request: CancelAIRequest
    ): void {

        if (
            !request.clientId?.trim()
        ) {

            throw new AppError(
                "Client ID is required.",
                400
            );

        }


        if (
            !request.message?.trim()
        ) {

            throw new AppError(
                "Cancellation request is required.",
                400
            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Validate AI Extraction
    |--------------------------------------------------------------------------
    */

    private static validateExtraction(
        extraction: CancelAIExtraction
    ): void {

        /*
        |--------------------------------------------------------------------------
        | Customer Identifier
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | Appointment Date
        |--------------------------------------------------------------------------
        */

        if (
            !extraction.appointment_date
        ) {

            throw new AppError(
                "Appointment date is required.",
                400
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Appointment Time
        |--------------------------------------------------------------------------
        */

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
    | Match Customer
    |--------------------------------------------------------------------------
    */

    private static matchesCustomer(

        booking: Booking,

        identifiers: {

            name: string;

            phone: string;

            email: string;

        }

    ): boolean {


        /*
        |--------------------------------------------------------------------------
        | Count Supplied Identifiers
        |--------------------------------------------------------------------------
        */

        const suppliedIdentifiers =
            [

                identifiers.name,

                identifiers.phone,

                identifiers.email

            ].filter(
                Boolean
            ).length;


        /*
        |--------------------------------------------------------------------------
        | Name
        |--------------------------------------------------------------------------
        */

        if (
            identifiers.name
        ) {

            const bookingName =
                this.normalizeName(
                    booking.customer_name
                );


            if (
                bookingName !==
                identifiers.name
            ) {

                return false;

            }

        }


        /*
        |--------------------------------------------------------------------------
        | Phone
        |--------------------------------------------------------------------------
        */

        if (
            identifiers.phone
        ) {

            const bookingPhone =
                this.normalizePhone(
                    booking.customer_phone
                );


            if (
                bookingPhone !==
                identifiers.phone
            ) {

                return false;

            }

        }


        /*
        |--------------------------------------------------------------------------
        | Email
        |--------------------------------------------------------------------------
        */

        if (
            identifiers.email
        ) {

            const bookingEmail =
                this.normalizeEmail(
                    booking.customer_email
                );


            if (
                bookingEmail !==
                identifiers.email
            ) {

                return false;

            }

        }


        /*
        |--------------------------------------------------------------------------
        | Safety
        |--------------------------------------------------------------------------
        |
        | At least one identifier must have been supplied.
        |
        |--------------------------------------------------------------------------
        */

        return suppliedIdentifiers > 0;

    }


    /*
    |--------------------------------------------------------------------------
    | Normalize Name
    |--------------------------------------------------------------------------
    */

    private static normalizeName(
        value: string | null | undefined
    ): string {

        if (
            !value
        ) {

            return "";

        }


        return value
            .trim()
            .replace(
                /\s+/g,
                " "
            )
            .toLowerCase();

    }


    /*
    |--------------------------------------------------------------------------
    | Normalize Phone
    |--------------------------------------------------------------------------
    |
    | Removes spaces, brackets, hyphens and other formatting.
    |
    | Example:
    |
    | +91 93486-11825
    | 9348611825
    |
    | are normalized consistently as much as possible.
    |--------------------------------------------------------------------------
    */

    private static normalizePhone(
        value: string | null | undefined
    ): string {

        if (
            !value
        ) {

            return "";

        }


        return value
            .replace(
                /\D/g,
                ""
            );

    }


    /*
    |--------------------------------------------------------------------------
    | Normalize Email
    |--------------------------------------------------------------------------
    */

    private static normalizeEmail(
        value: string | null | undefined
    ): string {

        if (
            !value
        ) {

            return "";

        }


        return value
            .trim()
            .toLowerCase();

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


        /*
        |--------------------------------------------------------------------------
        | Already YYYY-MM-DD
        |--------------------------------------------------------------------------
        */

        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(
                    trimmed
                )
        ) {

            return trimmed;

        }


        /*
        |--------------------------------------------------------------------------
        | Parse Date
        |--------------------------------------------------------------------------
        */

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

            parsed
                .getUTCFullYear(),

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


        /*
        |--------------------------------------------------------------------------
        | HH:mm / HH:mm:ss
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | Keep Unknown Format
        |--------------------------------------------------------------------------
        */

        return trimmed;

    }

}