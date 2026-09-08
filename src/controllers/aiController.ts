import { Request, Response } from "express";

import { asyncHandler } from "../middlewares/asyncHandler";

import { AppError } from "../errors/AppError";

import { IntentClassifierService } from "../services/ai/intentClassifierService";

import { BookingAIService } from "../services/ai/bookingAIService";

import { AvailabilityAIService } from "../services/ai/availabilityAIService";

import { CancelAIService } from "../services/ai/cancelAIService";

import { RescheduleAIService } from "../services/ai/rescheduleAIService";

import { ServicesAIService } from "../services/ai/servicesAIService";

import { FAQAIService } from "../services/ai/faqAIService";


export class AIController {

    /*
    |--------------------------------------------------------------------------
    | Chat
    |--------------------------------------------------------------------------
    */

    static chat = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            /*
            |--------------------------------------------------------------------------
            | Client
            |--------------------------------------------------------------------------
            */

            const clientId =

                req.user.clientId;

            /*
            |--------------------------------------------------------------------------
            | Message
            |--------------------------------------------------------------------------
            */

            const message =

                String(

                    req.body.message ?? ""

                ).trim();

            if (

                !message

            ) {

                throw new AppError(

                    "Message is required.",

                    400

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Detect Intent
            |--------------------------------------------------------------------------
            */

            const intent =

                await IntentClassifierService.classify({

                    message

                });

            let result: any;

            /*
            |--------------------------------------------------------------------------
            | Route Intent
            |--------------------------------------------------------------------------
            */

            switch (

                intent

            ) {

                /*
                |--------------------------------------------------------------------------
                | Booking
                |--------------------------------------------------------------------------
                */

                case "booking":

                    result =

                        await BookingAIService.handle({

                            clientId,

                            message

                        });

                    break;


                /*
                |--------------------------------------------------------------------------
                | Availability
                |--------------------------------------------------------------------------
                */

                case "availability":

                    result =

                        await AvailabilityAIService.handle({

                            clientId,

                            message

                        });

                    break;


                /*
                |--------------------------------------------------------------------------
                | Cancellation
                |--------------------------------------------------------------------------
                */

                case "cancel":

                    result =

                        await CancelAIService.handle({

                            clientId,

                            message

                        });

                    break;


                /*
                |--------------------------------------------------------------------------
                | Reschedule
                |--------------------------------------------------------------------------
                */

                case "reschedule":

                    result =

                        await RescheduleAIService.handle({

                            clientId,

                            message

                        });

                    break;


                /*
                |--------------------------------------------------------------------------
                | Services
                |--------------------------------------------------------------------------
                */

                case "services":

                    result =

                        await ServicesAIService.handle({

                            clientId,

                            message

                        });

                    break;


                /*
                |--------------------------------------------------------------------------
                | FAQ
                |--------------------------------------------------------------------------
                */

                case "faq":

                    result =

                        await FAQAIService.handle({

                            clientId,

                            message

                        });

                    break;


                /*
                |--------------------------------------------------------------------------
                | Unknown
                |--------------------------------------------------------------------------
                */

                default:

                    throw new AppError(

                        "Unable to determine the customer's intent.",

                        400

                    );

            }

            /*
            |--------------------------------------------------------------------------
            | Response
            |--------------------------------------------------------------------------
            */

            res.status(200).json({

                success: true,

                intent,

                data: result

            });

        }

    );

}