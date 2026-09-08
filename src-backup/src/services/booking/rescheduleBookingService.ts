import { Booking } from "../../types/booking";
import { Client } from "../../types/client";
import { Service } from "../../types/service";
import { BusinessSettings } from "../../types/businessSettings";

import { BookingRepository } from "../../repositories/bookingRepository";

import { ClientService } from "../clients/clientService";
import { ServiceService } from "../serviceService";
import { BusinessSettingsService } from "../business/businessSettingsService";

import { AvailabilityService } from "../availability/availabilityService";

import { GoogleCalendarService } from "../google/googleCalendarService";
import { GoogleSheetsService } from "../google/googleSheetsService";

import { AppError } from "../../errors/AppError";

export interface RescheduleBookingRequest {

    bookingId: string;

    appointment_date: string;

    appointment_time: string;

    service_id?: string;

}

export class RescheduleBookingService {

    /*
    |--------------------------------------------------------------------------
    | Reschedule Booking
    |--------------------------------------------------------------------------
    */

    static async reschedule(

        request: RescheduleBookingRequest

    ): Promise<Booking> {

        /*
        |--------------------------------------------------------------------------
        | Booking
        |--------------------------------------------------------------------------
        */

        const booking =

            await BookingRepository.findById(

                request.bookingId

            );

        this.validateBooking(

            booking

        );

        /*
        |--------------------------------------------------------------------------
        | Client
        |--------------------------------------------------------------------------
        */

        const client =

            await ClientService.get(

                booking.client_id

            );

        /*
        |--------------------------------------------------------------------------
        | Business Settings
        |--------------------------------------------------------------------------
        */

        const businessSettings =

            await BusinessSettingsService.get(

                booking.client_id

            );

        /*
        |--------------------------------------------------------------------------
        | Service
        |--------------------------------------------------------------------------
        */

        let service: Service | null = null;

        if (

            request.service_id

        ) {

            service =

                await ServiceService.get(

                    request.service_id

                );

        }

        /*
        |--------------------------------------------------------------------------
        | Updated Booking
        |--------------------------------------------------------------------------
        */

        const updatedBooking =

            this.buildBooking(

                booking,

                request,

                service

            );

        /*
        |--------------------------------------------------------------------------
        | Availability
        |--------------------------------------------------------------------------
        */

        const availability =

            await AvailabilityService.checkAvailability({

                booking:

                    updatedBooking,

                client,

                businessSettings,

                excludeBookingId:

                    booking.id

            });

        if (

            !availability.available

        ) {

            throw new AppError(

                availability.reason,

                409

            );

        }

        /*
        |--------------------------------------------------------------------------
        | Google Calendar
        |--------------------------------------------------------------------------
        */

        if (

            booking.google_calendar_event_id

        ) {

           await GoogleCalendarService.updateEvent({

    clientId:

        booking.client_id,

    booking:

        updatedBooking,

    client,

    businessSettings,

    eventId:

        booking.google_calendar_event_id

});

        }

        /*
        |--------------------------------------------------------------------------
        | Database
        |--------------------------------------------------------------------------
        */

        const savedBooking =

            await BookingRepository.update(

                booking.id!,

                updatedBooking

            );

        /*
        |--------------------------------------------------------------------------
        | Google Sheets
        |--------------------------------------------------------------------------
        */

        await GoogleSheetsService.updateBooking({

            booking:

                savedBooking,

            client

        });

        return savedBooking;

    }

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    private static validateBooking(

        booking: Booking

    ): void {

        if (

            booking.status === "cancelled"

        ) {

            throw new AppError(

                "Cancelled bookings cannot be rescheduled.",

                400

            );

        }

        if (

            booking.status === "completed"

        ) {

            throw new AppError(

                "Completed bookings cannot be rescheduled.",

                400

            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Build Updated Booking
    |--------------------------------------------------------------------------
    */

    private static buildBooking(

        booking: Booking,

        request: RescheduleBookingRequest,

        service: Service | null

    ): Booking {

        return {

            ...booking,

            appointment_date:

                request.appointment_date,

            appointment_time:

                request.appointment_time,

            ...(service && {

                service_id:

                    service.id!,

                service_name:

                    service.name,

                service_duration_minutes:

                    service.duration_minutes,

                service_price:

                    service.price,

                service_currency:

                    service.currency

            })

        };

    }

}