import { Booking } from "../../types/booking";
import { Client } from "../../types/client";

import { BookingRepository } from "../../repositories/bookingRepository";

import { ClientService } from "../clients/clientService";

import { GoogleCalendarService } from "../google/googleCalendarService";
import { GoogleSheetsService } from "../google/googleSheetsService";

import { AppError } from "../../errors/AppError";

export interface CancelBookingRequest {

    bookingId: string;

}

export class CancelBookingService {

    /*
    |--------------------------------------------------------------------------
    | Cancel Booking
    |--------------------------------------------------------------------------
    */

    static async cancel(

        request: CancelBookingRequest

    ): Promise<Booking> {

        /*
        |--------------------------------------------------------------------------
        | Load Booking
        |--------------------------------------------------------------------------
        */

        const booking =

            await this.getBooking(

                request.bookingId

            );

        /*
        |--------------------------------------------------------------------------
        | Validate
        |--------------------------------------------------------------------------
        */

        this.validateBooking(

            booking

        );

        /*
        |--------------------------------------------------------------------------
        | Load Client
        |--------------------------------------------------------------------------
        */

        const client =

            await ClientService.get(

                booking.client_id

            );

        /*
        |--------------------------------------------------------------------------
        | Google Calendar
        |--------------------------------------------------------------------------
        */

        await this.removeCalendarEvent(

            booking

        );

        /*
        |--------------------------------------------------------------------------
        | Database
        |--------------------------------------------------------------------------
        */

        const cancelledBooking =

            await BookingRepository.cancel(

                booking.id!

            );

        /*
        |--------------------------------------------------------------------------
        | Google Sheets
        |--------------------------------------------------------------------------
        */

        await this.updateGoogleSheets(

            cancelledBooking,

            client

        );

        return cancelledBooking;

    }

    /*
    |--------------------------------------------------------------------------
    | Get Booking
    |--------------------------------------------------------------------------
    */

    private static async getBooking(

        bookingId: string

    ): Promise<Booking> {

        return await BookingRepository.findById(

            bookingId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Validate Booking
    |--------------------------------------------------------------------------
    */

    private static validateBooking(

        booking: Booking

    ): void {

        if (

            booking.status === "cancelled"

        ) {

            throw new AppError(

                "Booking is already cancelled.",

                400

            );

        }

        if (

            booking.status === "completed"

        ) {

            throw new AppError(

                "Completed bookings cannot be cancelled.",

                400

            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Delete Calendar Event
    |--------------------------------------------------------------------------
    */

    private static async removeCalendarEvent(

        booking: Booking

    ): Promise<void> {

        if (

            !booking.google_calendar_event_id

        ) {

            return;

        }

        await GoogleCalendarService.deleteEvent(

            booking.client_id,

            booking.google_calendar_event_id

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Update Google Sheets
    |--------------------------------------------------------------------------
    */

    private static async updateGoogleSheets(

        booking: Booking,

        client: Client

    ): Promise<void> {

        await GoogleSheetsService.updateBooking({

            booking,

            client

        });

    }

}