import {
    CancelBookingService
} from "../../services/booking/cancelBookingService";

import {
    CancelToolInput,
    CancelToolOutput
} from "./cancelSchemas";

export class CancelTool {

    /*
    |--------------------------------------------------------------------------
    | Execute
    |--------------------------------------------------------------------------
    */

    static async execute(

        input: CancelToolInput

    ): Promise<CancelToolOutput> {

        /*
        |--------------------------------------------------------------------------
        | Cancel Booking
        |--------------------------------------------------------------------------
        */

        await CancelBookingService.cancel({

            bookingId:

                input.bookingId

        });

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        return {

            success: true,

            bookingId:

                input.bookingId,

            message:

                "Appointment cancelled successfully."

        };

    }

}