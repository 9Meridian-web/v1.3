import { ServiceService } from "../serviceService";

import { AppError } from "../../errors/AppError";

import { Service } from "../../types/service";

/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

export interface ServicesAIRequest {

    clientId: string;

    message: string;

}

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

export interface ServicesAIResponse {

    success: boolean;

    message: string;

    services?: Service[];

}

/*
|--------------------------------------------------------------------------
| Services AI Service
|--------------------------------------------------------------------------
*/

export class ServicesAIService {

    /*
    |--------------------------------------------------------------------------
    | Handle
    |--------------------------------------------------------------------------
    */

    static async handle(

        request: ServicesAIRequest

    ): Promise<ServicesAIResponse> {

        const services =

            await ServiceService.getActive(

                request.clientId

            );

        if (

            services.length === 0

        ) {

            throw new AppError(

                "No services are configured for this business.",

                404

            );

        }

        const keyword =

            request.message

                .trim()

                .toLowerCase();

        /*
        |--------------------------------------------------------------------------
        | Try Exact Match
        |--------------------------------------------------------------------------
        */

        const matchedService =

            services.find(

                service =>

                    keyword.includes(

                        service.name

                            .toLowerCase()

                    )

            );

        if (

            matchedService

        ) {

            return {

                success: true,

                message:

`Service: ${matchedService.name}

Duration: ${matchedService.duration_minutes} minutes

Price: ${matchedService.price} ${matchedService.currency}

${matchedService.description ?? ""}`,

                services: [

                    matchedService

                ]

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Return All Services
        |--------------------------------------------------------------------------
        */

        const message =

            services

                .map(

                    service =>

`• ${service.name}
  ${service.duration_minutes} min
  ${service.price} ${service.currency}`

                )

                .join("\n\n");

        return {

            success: true,

            message:

`Available services:

${message}`,

            services

        };

    }

}