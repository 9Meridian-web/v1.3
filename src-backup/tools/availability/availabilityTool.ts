import { AvailabilityService } from "../../services/availability/availabilityService";

import { ClientService } from "../../services/clients/clientService";
import { BusinessSettingsService } from "../../services/business/businessSettingsService";

import { Booking } from "../../types/booking";

import {

    AvailabilityToolInput,

    AvailabilityToolOutput

} from "./availabilitySchemas";

export class AvailabilityTool {

    /*
    |--------------------------------------------------------------------------
    | Check Availability
    |--------------------------------------------------------------------------
    */

    static async execute(

        input: AvailabilityToolInput

    ): Promise<AvailabilityToolOutput> {

        /*
        |--------------------------------------------------------------------------
        | Load Client
        |--------------------------------------------------------------------------
        */

        const client =

            await ClientService.get(

                input.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Business Settings
        |--------------------------------------------------------------------------
        */

        const businessSettings =

            await BusinessSettingsService.get(

                input.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Temporary Booking
        |--------------------------------------------------------------------------
        */

        const booking: Booking = {
            client_id: input.clientId,

            customer_name: "",

            customer_phone: "",

            appointment_date: input.appointmentDate,

            appointment_time: input.appointmentTime,

            status: "confirmed",
            reason: "",
            service_id: "",
            service_name: "",
            service_duration_minutes: 0,
            service_price: 0,
            service_currency: ""
        };

        /*
        |--------------------------------------------------------------------------
        | Check Availability
        |--------------------------------------------------------------------------
        */

        const result =

            await AvailabilityService.checkAvailability({

                booking,

                client,

                businessSettings

            });

        /*
        |--------------------------------------------------------------------------
        | Return
        |--------------------------------------------------------------------------
        */

        return {

            available:

                result.available,

            reason:

                result.reason,

            suggestedSlots:

                result.suggestedSlots

        };

    }

}