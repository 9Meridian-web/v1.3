import { AvailabilityPrompt } from "../../prompts/availabilityPrompt";

import { GeminiService } from "./geminiService";

import { JsonParserService } from "../parsers/jsonParserService";

import { AvailabilityService } from "../availability/availabilityService";

import { ClientService } from "../clients/clientService";

import { BusinessSettingsService } from "../business/businessSettingsService";

import { ServiceService } from "../serviceService";

import { AppError } from "../../errors/AppError";

import { Booking } from "../../types/booking";

/*
|--------------------------------------------------------------------------
| AI Extraction
|--------------------------------------------------------------------------
*/

interface AvailabilityAIExtraction {

    appointment_date: string | null;

    appointment_time: string | null;

    service_name: string | null;

    confidence?: number;

}

/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

export interface AvailabilityAIRequest {

    clientId: string;

    message: string;

}

/*
|--------------------------------------------------------------------------
| Availability AI Service
|--------------------------------------------------------------------------
*/

export class AvailabilityAIService {

    /*
    |--------------------------------------------------------------------------
    | Handle
    |--------------------------------------------------------------------------
    */

    static async handle(

        request: AvailabilityAIRequest

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

            AvailabilityPrompt.build(

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

            JsonParserService.parse<AvailabilityAIExtraction>(

                response

            );

        /*
        |--------------------------------------------------------------------------
        | Validate Date
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
        | Validate Time
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

        /*
        |--------------------------------------------------------------------------
        | Load Business Settings
        |--------------------------------------------------------------------------
        */

        const businessSettings =

            await BusinessSettingsService.get(

                request.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Load Services
        |--------------------------------------------------------------------------
        */

        const services =

            await ServiceService.getActive(

                request.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Resolve Service
        |--------------------------------------------------------------------------
        */

        let service;

        if (

            extraction.service_name

        ) {

            service =

                services.find(

                    item =>

                        item.name

                            .trim()

                            .toLowerCase() ===

                        extraction.service_name!

                            .trim()

                            .toLowerCase()

                );

            if (

                !service

            ) {

                throw new AppError(

                    `Service "${extraction.service_name}" was not found.`,

                    404

                );

            }

        }

        /*
        |--------------------------------------------------------------------------
        | Require Service When Multiple Services Exist
        |--------------------------------------------------------------------------
        */

        if (

            !service

        ) {

            if (

                services.length === 1

            ) {

                service = services[0];

            }

            else {

                throw new AppError(

                    "Service name is required.",

                    400

                );

            }

        }

        /*
        |--------------------------------------------------------------------------
        | Temporary Booking
        |--------------------------------------------------------------------------
        */

        const booking: Booking = {

            client_id:

                request.clientId,

            customer_name:

                "AI Customer",

            customer_phone:

                "",

            customer_email:

                null,

            appointment_date:

                extraction.appointment_date,

            appointment_time:

                extraction.appointment_time,

            service_id:

                service.id!,

            service_name:

                service.name,

            service_duration_minutes:

                service.duration_minutes,

            service_price:

                service.price,

            service_currency:

                service.currency,

            status:

                "pending",

            reason:

                null,

            notes:

                null,

            service:

                ""

        };

        /*
        |--------------------------------------------------------------------------
        | Availability Check
        |--------------------------------------------------------------------------
        */

        return await AvailabilityService.checkAvailability({

            booking,

            client,

            businessSettings

        });

    }

}