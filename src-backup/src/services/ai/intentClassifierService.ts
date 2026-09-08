import { GeminiService } from "./geminiService";

import { JsonParserService } from "../parsers/jsonParserService";

import { AppError } from "../../errors/AppError";

/*
|--------------------------------------------------------------------------
| Supported Intents
|--------------------------------------------------------------------------
*/

export type AIIntent =

    | "booking"

    | "availability"

    | "cancel"

    | "reschedule"

    | "services"

    | "faq";

/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

export interface IntentClassifierRequest {

    message: string;

}

/*
|--------------------------------------------------------------------------
| AI Response
|--------------------------------------------------------------------------
*/

interface IntentClassifierResponse {

    intent: AIIntent;

}

/*
|--------------------------------------------------------------------------
| Intent Classifier
|--------------------------------------------------------------------------
*/

export class IntentClassifierService {

    /*
    |--------------------------------------------------------------------------
    | Classify Intent
    |--------------------------------------------------------------------------
    */

    static async classify(

        request: IntentClassifierRequest

    ): Promise<AIIntent> {

        const prompt = `

You are an AI intent classifier.

Your ONLY job is to classify the user's message.

Return ONLY JSON.

Schema:

{
    "intent":"booking"
}

Allowed intents:

booking
availability
cancel
reschedule
services
faq

Examples

User:
Book me a haircut tomorrow.

Output:
{
    "intent":"booking"
}

User:
Cancel my appointment.

Output:
{
    "intent":"cancel"
}

User:
Move my appointment to Friday.

Output:
{
    "intent":"reschedule"
}

User:
Are you free tomorrow?

Output:
{
    "intent":"availability"
}

User:
What services do you offer?

Output:
{
    "intent":"services"
}

User:
Where are you located?

Output:
{
    "intent":"faq"
}

User Message:

${request.message}

`;

        const response =

            await GeminiService.generate({

                prompt,

                temperature: 0

            });

        const result =

            JsonParserService.parse<IntentClassifierResponse>(

                response

            );

        this.validate(

            result.intent

        );

        return result.intent;

    }

    /*
    |--------------------------------------------------------------------------
    | Validate Intent
    |--------------------------------------------------------------------------
    */

    private static validate(

        intent: string

    ): void {

        const intents: AIIntent[] = [

            "booking",

            "availability",

            "cancel",

            "reschedule",

            "services",

            "faq"

        ];

        if (

            !intents.includes(

                intent as AIIntent

            )

        ) {

            throw new AppError(

                `Unknown AI intent: ${intent}`,

                400

            );

        }

    }

}