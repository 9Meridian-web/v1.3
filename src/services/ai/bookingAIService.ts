import { GeminiService } from "./geminiService";
import { JsonParserService } from "../parsers/jsonParserService";
import { BookingPrompt } from "../../prompts/bookingPrompt";
import { BookingTool } from "../../tools/booking/bookingTool";
import { AppError } from "../../errors/AppError";
import { ClientService } from "../clients/clientService";
import { ServiceService } from "../serviceService";
import { Service } from "../../types/service";

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

        const message =
            String(request.message ?? "").trim();

        if (!message) {

            throw new AppError(
                "Message is required.",
                400
            );

        }

        /*
        |--------------------------------------------------------------------------
        | SERVICE INFORMATION GUARD
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | Information questions MUST NEVER enter the booking pipeline.
        |
        | This check happens BEFORE Gemini.
        |
        |--------------------------------------------------------------------------
        */

        if (
            this.isServiceInformationRequest(
                message
            )
        ) {

            return await this.handleServiceInformation(
                request.clientId,
                message
            );

        }

        /*
        |--------------------------------------------------------------------------
        | COURTESY MESSAGE GUARD
        |--------------------------------------------------------------------------
        */

        if (
            this.isCourtesyMessage(
                message
            )
        ) {

            return {

                success: true,

                intent: "conversation",

                message:
                    "You're very welcome! Is there anything else I can help you with?"

            };

        }

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
        | Build Booking Prompt
        |--------------------------------------------------------------------------
        */

        const prompt =
            BookingPrompt.build(
                message,
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
        | Validate Booking Extraction
        |--------------------------------------------------------------------------
        */

        this.validate(
            booking
        );

        /*
        |--------------------------------------------------------------------------
        | Execute Booking
        |--------------------------------------------------------------------------
        */

        const result =
            await BookingTool.execute({

                clientId:
                    request.clientId,

                customer_name:
                    booking.customer_name!,

                customer_phone:
                    booking.customer_phone!,

                customer_email:
                    booking.customer_email ??
                    undefined,

                service_name:
                    booking.service_name!,

                appointment_date:
                    booking.appointment_date!,

                appointment_time:
                    booking.appointment_time!,

                reason:
                    booking.reason ??
                    undefined,

                notes:
                    booking.notes ??
                    undefined

            });

        /*
        |--------------------------------------------------------------------------
        | Return Clean Response
        |--------------------------------------------------------------------------
        */

        return {

            success:
                result.success,

            intent:
                "booking",

            message:
                result.message,

            data:
                result.booking ??
                null

        };

    }

    /*
    |--------------------------------------------------------------------------
    | SERVICE INFORMATION REQUEST DETECTOR
    |--------------------------------------------------------------------------
    */

    private static isServiceInformationRequest(
        message: string
    ): boolean {

        const text =
            message
                .toLowerCase()
                .replace(/[?!.,]/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        /*
        |--------------------------------------------------------------------------
        | Explicit booking language takes priority.
        |--------------------------------------------------------------------------
        */

        const explicitBooking =
            /\b(book|booking|schedule|scheduled|reserve|reservation)\b/.test(text) ||

            /\bmake\s+(an?\s+)?appointment\b/.test(text) ||

            /\bi\s+want\s+(to\s+)?(book|schedule|reserve)\b/.test(text);

        if (
            explicitBooking
        ) {

            return false;

        }

        /*
        |--------------------------------------------------------------------------
        | Information-question patterns
        |--------------------------------------------------------------------------
        */

        const servicePatterns: RegExp[] = [

            /\bwhat\s+(services?|treatments?)\s+do\s+you\s+offer\b/,

            /\bwhat\s+(services?|treatments?)\s+(do\s+you|are)\b/,

            /\bwhat\s+do\s+you\s+offer\b/,

            /\bhow\s+much\s+(does|is|for)\b/,

            /\bhow\s+much\b.*\b(cost|price)\b/,

            /\bwhat\s+(is|are)\s+the\s+(price|cost)\b/,

            /\bwhat(?:'s| is)\s+the\s+price\b/,

            /\bwhat(?:'s| is)\s+the\s+cost\b/,

            /\bprice\s+(of|for)\b/,

            /\bcost\s+(of|for)\b/,

            /\bhow\s+long\s+(is|does)\b/,

            /\bhow\s+many\s+minutes\b/,

            /\bwhat(?:'s| is)\s+the\s+duration\b/,

            /\bduration\s+(of|for)\b/

        ];

        return servicePatterns.some(
            pattern =>
                pattern.test(text)
        );

    }

    /*
    |--------------------------------------------------------------------------
    | SERVICE INFORMATION HANDLER
    |--------------------------------------------------------------------------
    */

    private static async handleServiceInformation(
        clientId: string,
        message: string
    ): Promise<unknown> {

        const services =
            await ServiceService.getActive(
                clientId
            );

        /*
        |--------------------------------------------------------------------------
        | No Active Services
        |--------------------------------------------------------------------------
        */

        if (
            !services.length
        ) {

            return {

                success: true,

                intent: "services",

                message:
                    "I'm sorry, there are currently no active services available.",

                services: []

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Find Specific Requested Service
        |--------------------------------------------------------------------------
        */

        const requestedService =
            this.findMentionedService(
                message,
                services
            );

        /*
        |--------------------------------------------------------------------------
        | Specific Service
        |--------------------------------------------------------------------------
        */

        if (
            requestedService
        ) {

            return {

                success: true,

                intent: "services",

                message:
                    `${requestedService.name} costs ${requestedService.price} ${requestedService.currency} and takes ${requestedService.duration_minutes} minutes.`,

                services: [
                    requestedService
                ]

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Complete Service Catalogue
        |--------------------------------------------------------------------------
        */

        const lines =
            services.map(
                service =>
                    `• ${service.name}\n  ${service.duration_minutes} min\n  ${service.price} ${service.currency}`
            );

        return {

            success: true,

            intent: "services",

            message:
                `Available services:\n\n${lines.join("\n\n")}`,

            services

        };

    }

    /*
    |--------------------------------------------------------------------------
    | FIND MENTIONED SERVICE
    |--------------------------------------------------------------------------
    */

    private static findMentionedService(
        message: string,
        services: Service[]
    ): Service | null {

        const text =
            message.toLowerCase();

        /*
        |--------------------------------------------------------------------------
        | Longest names first
        |--------------------------------------------------------------------------
        */

        const sorted =
            [...services].sort(
                (a, b) =>
                    b.name.length -
                    a.name.length
            );

        return (
            sorted.find(
                service =>
                    text.includes(
                        service.name
                            .trim()
                            .toLowerCase()
                    )
            ) ??
            null
        );

    }

    /*
    |--------------------------------------------------------------------------
    | COURTESY MESSAGE DETECTOR
    |--------------------------------------------------------------------------
    */

    private static isCourtesyMessage(
        message: string
    ): boolean {

        const text =
            message
                .toLowerCase()
                .replace(/[!.,?]/g, "")
                .trim();

        return [

            "thanks",

            "thank you",

            "thanks for your service",

            "thank you for your service",

            "okay thanks",

            "ok thanks",

            "great thanks",

            "bye",

            "goodbye",

            "that's all",

            "thats all"

        ].includes(
            text
        );

    }

    /*
    |--------------------------------------------------------------------------
    | BOOKING VALIDATION
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