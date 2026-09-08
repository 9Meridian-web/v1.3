import {
    GoogleGenerativeAI,
    GenerationConfig
} from "@google/generative-ai";

import { AppError } from "../../errors/AppError";

export interface GeminiRequest {

    prompt: string;

    temperature?: number;

    maxOutputTokens?: number;

}

export class GeminiService {

    /*
    |--------------------------------------------------------------------------
    | Gemini Client
    |--------------------------------------------------------------------------
    */

    private static readonly client =
        new GoogleGenerativeAI(

            process.env.GEMINI_API_KEY!

        );

    /*
    |--------------------------------------------------------------------------
    | Model
    |--------------------------------------------------------------------------
    */

    private static readonly MODEL =

        process.env.GEMINI_MODEL ??

        "gemini-2.5-flash";

    /*
    |--------------------------------------------------------------------------
    | Generate Response
    |--------------------------------------------------------------------------
    */

    static async generate(

        request: GeminiRequest

    ): Promise<string> {

        try {

            if (

                !request.prompt ||

                request.prompt.trim().length === 0

            ) {

                throw new AppError(

                    "Prompt cannot be empty.",

                    400

                );

            }

            const model =

                this.client.getGenerativeModel({

                    model: this.MODEL

                });

            const generationConfig: GenerationConfig = {

                temperature:

                    request.temperature ?? 0.2,

                maxOutputTokens:

                    request.maxOutputTokens ?? 1024

            };

            const result =

                await model.generateContent({

                    contents: [

                        {

                            role: "user",

                            parts: [

                                {

                                    text: request.prompt

                                }

                            ]

                        }

                    ],

                    generationConfig

                });

            const text =

                result.response.text().trim();

            if (

                !text

            ) {

                throw new AppError(

                    "Gemini returned an empty response.",

                    500

                );

            }

            return text;

        }

        catch (error: any) {

            console.error(

                "\n========== GEMINI ERROR =========="

            );

            console.error(

                error

            );

            console.error(

                "==================================\n"

            );

            if (

                error instanceof AppError

            ) {

                throw error;

            }

            throw new AppError(

                error?.message ??

                "Gemini request failed.",

                500

            );

        }

    }

}