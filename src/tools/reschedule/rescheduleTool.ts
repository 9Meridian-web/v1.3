import { Booking } from "../../types/booking";

import {
    RescheduleBookingService,
    RescheduleBookingRequest
} from "../../services/booking/rescheduleBookingService";

import {
    RescheduleToolInput,
    RescheduleToolOutput
} from "./rescheduleSchemas";

export class RescheduleTool {

    /*
    |--------------------------------------------------------------------------
    | Execute
    |--------------------------------------------------------------------------
    */

    static async execute(

        input: RescheduleToolInput

    ): Promise<RescheduleToolOutput> {

        /*
        |--------------------------------------------------------------------------
        | Build Request
        |--------------------------------------------------------------------------
        */

        const request: RescheduleBookingRequest = {

            clientId: input.clientId,

            bookingId: input.bookingId,

            appointment_date: input.appointmentDate,

            appointment_time: input.appointmentTime

        };

        /*
        |--------------------------------------------------------------------------
        | Reschedule Booking
        |--------------------------------------------------------------------------
        */

        const booking: Booking =

            await RescheduleBookingService.reschedule(

                request

            );

        /*
        |--------------------------------------------------------------------------
        | Return Response
        |--------------------------------------------------------------------------
        */

        return {

            success: true,

            bookingId: booking.id!,

            customerName: booking.customer_name,

            appointmentDate: booking.appointment_date,

            appointmentTime: booking.appointment_time,

            status: booking.status,

            message: "Appointment rescheduled successfully."

        };

    }

}