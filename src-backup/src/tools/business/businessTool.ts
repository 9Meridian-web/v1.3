import { ClientService } from "../../services/clients/clientService";
import { BusinessSettingsService } from "../../services/business/businessSettingsService";

import {
    BusinessToolInput,
    BusinessToolOutput
} from "./businessSchemas";

export class BusinessTool {

    /*
    |--------------------------------------------------------------------------
    | Execute
    |--------------------------------------------------------------------------
    */

    static async execute(

        input: BusinessToolInput

    ): Promise<BusinessToolOutput> {

        /*
        |--------------------------------------------------------------------------
        | Load Data
        |--------------------------------------------------------------------------
        */

        const client =
            await ClientService.get(

                input.clientId

            );

        const settings =
            await BusinessSettingsService.get(

                input.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Return
        |--------------------------------------------------------------------------
        */

        return {

            businessName:

                client.business_name,

            ownerName:

                client.owner_name,

            email:

                client.email,

            phone:

                client.phone,

            website:

                client.website,

            timezone:

                client.timezone,

            locale:

                client.locale,

            openingTime:

                settings.opening_time,

            closingTime:

                settings.closing_time,

            workingDays:

                settings.working_days,

            appointmentDuration:

                settings.appointment_duration,

            bufferMinutes:

                settings.buffer_minutes

        };

    }

}