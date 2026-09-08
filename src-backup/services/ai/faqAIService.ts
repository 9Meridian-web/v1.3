import { FAQPrompt } from "../../prompts/faqPrompt";

import { GeminiService } from "./geminiService";

import { JsonParserService } from "../parsers/jsonParserService";

import { BusinessSettingsService } from "../business/businessSettingsService";

import { ServiceService } from "../serviceService";

import { AppError } from "../../errors/AppError";


/*
|--------------------------------------------------------------------------
| AI Extraction
|--------------------------------------------------------------------------
*/

interface FAQAIExtraction {

    answer: string;

    confidence: number;

}


/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

export interface FAQAIRequest {

    clientId: string;

    message: string;

}


/*
|--------------------------------------------------------------------------
| FAQ AI Service
|--------------------------------------------------------------------------
*/

export class FAQAIService {

    /*
    |--------------------------------------------------------------------------
    | Handle
    |--------------------------------------------------------------------------
    */

    static async handle(

        request: FAQAIRequest

    ): Promise<FAQAIExtraction> {

        /*
        |--------------------------------------------------------------------------
        | Business Settings
        |--------------------------------------------------------------------------
        */

        const settings =

            await BusinessSettingsService.get(

                request.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Active Services
        |--------------------------------------------------------------------------
        */

        const services =

            await ServiceService.getActive(

                request.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Business Context
        |--------------------------------------------------------------------------
        */

        const businessContext =

            JSON.stringify(

                {

                    business: {

                        name:

                            settings.business_name,

                        description:

                            settings.business_description,

                        phone:

                            settings.phone,

                        email:

                            settings.email,

                        address:

                            settings.address,

                        opening_time:

                            settings.opening_time,

                        closing_time:

                            settings.closing_time,

                        working_days:

                            settings.working_days

                    },

                    services:

                        services.map(

                            service => ({

                                name:

                                    service.name,

                                description:

                                    service.description,

                                category:

                                    service.category,

                                duration_minutes:

                                    service.duration_minutes,

                                price:

                                    service.price,

                                currency:

                                    service.currency,

                                online_booking:

                                    service.online_booking,

                                is_active:

                                    service.is_active

                            })

                        )

                },

                null,

                2

            );

        /*
        |--------------------------------------------------------------------------
        | Build Prompt
        |--------------------------------------------------------------------------
        */

        const prompt =

            FAQPrompt.build(

                request.message,

                businessContext

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

        const result =

            JsonParserService.parse<FAQAIExtraction>(

                response

            );

        /*
        |--------------------------------------------------------------------------
        | Validate
        |--------------------------------------------------------------------------
        */

        if (

            !result.answer ||

            typeof result.answer !==

            "string"

        ) {

            throw new AppError(

                "FAQ AI could not generate an answer.",

                500

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Return
        |--------------------------------------------------------------------------
        */

        return {

            answer:

                result.answer,

            confidence:

                typeof result.confidence ===

                "number"

                    ? result.confidence

                    : 0

        };

    }

}