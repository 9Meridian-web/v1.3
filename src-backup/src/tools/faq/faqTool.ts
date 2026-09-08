import { BusinessSettingsService } from "../../services/business/businessSettingsService";

import { ServiceService } from "../../services/serviceService";

import { Service } from "../../types/service";

/*
|--------------------------------------------------------------------------
| FAQ Tool Input
|--------------------------------------------------------------------------
*/

export interface FAQToolInput {

    clientId: string;

    question: string;

}

/*
|--------------------------------------------------------------------------
| FAQ Tool Output
|--------------------------------------------------------------------------
*/

export interface FAQToolOutput {

    success: boolean;

    businessName: string;

    description?: string;

    phone?: string;

    email?: string;

    address?: string;

    openingTime?: string;

    closingTime?: string;

    workingDays: string[];

    services: string[];

}

/*
|--------------------------------------------------------------------------
| FAQ Tool
|--------------------------------------------------------------------------
*/

export class FAQTool {

    /*
    |--------------------------------------------------------------------------
    | Execute
    |--------------------------------------------------------------------------
    */

    static async execute(

        input: FAQToolInput

    ): Promise<FAQToolOutput> {

        /*
        |--------------------------------------------------------------------------
        | Business Settings
        |--------------------------------------------------------------------------
        */

        const settings =

            await BusinessSettingsService.get(

                input.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Active Services
        |--------------------------------------------------------------------------
        */

        const services =

            await ServiceService.getActive(

                input.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        return {

            success: true,

            businessName:

                settings.business_name,

            description:

                settings.business_description,

            phone:

                settings.phone,

            email:

                settings.email,

            address:

                settings.address,

            openingTime:

                settings.opening_time,

            closingTime:

                settings.closing_time,

            workingDays:

                settings.working_days,

            services:

                services.map(

                    (

                        service: Service

                    ) =>

                        service.name

                )

        };

    }

}