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
import { GoogleService } from "../google/googleService";

import { AppError } from "../../errors/AppError";


/*
|--------------------------------------------------------------------------
| Reschedule Booking Request
|--------------------------------------------------------------------------
*/

export interface RescheduleBookingRequest {

    bookingId: string;

    clientId: string;

    appointment_date: string;

    appointment_time: string;

    service_id?: string;

}


/*
|--------------------------------------------------------------------------
| Reschedule Booking Service
|--------------------------------------------------------------------------
*/

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
        | Validate Request
        |--------------------------------------------------------------------------
        */

        this.validateRequest(
            request
        );


        /*
        |--------------------------------------------------------------------------
        | Load Existing Booking
        |--------------------------------------------------------------------------
        */

        const booking =
            await BookingRepository.findById(
                request.bookingId
            );


        /*
        |--------------------------------------------------------------------------
        | Client Isolation
        |--------------------------------------------------------------------------
        */

        if (
            booking.client_id !==
            request.clientId
        ) {

            throw new AppError(
                "Booking not found.",
                404
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Validate Booking Status
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
        | Business Settings
        |--------------------------------------------------------------------------
        */

        const businessSettings =
            await BusinessSettingsService.get(
                booking.client_id
            );


        /*
        |--------------------------------------------------------------------------
        | Resolve Service
        |--------------------------------------------------------------------------
        */

        let service:
            Service | null = null;


        if (
            request.service_id
        ) {

            service =
                await ServiceService.get(
                    request.service_id
                );


            /*
            |--------------------------------------------------------------------------
            | Service Ownership
            |--------------------------------------------------------------------------
            */

            if (
                service.client_id !==
                booking.client_id
            ) {

                throw new AppError(
                    "Selected service does not belong to this business.",
                    400
                );

            }


            /*
            |--------------------------------------------------------------------------
            | Service Active
            |--------------------------------------------------------------------------
            */

            if (
                !service.is_active
            ) {

                throw new AppError(
                    "Selected service is not available.",
                    400
                );

            }

        }


        /*
        |--------------------------------------------------------------------------
        | Build Updated Booking
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
        | Check If Anything Changed
        |--------------------------------------------------------------------------
        */

        if (
            this.isSameAppointment(
                booking,
                updatedBooking
            )
        ) {

            throw new AppError(
                "The new appointment details are the same as the current booking.",
                400
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Availability Check
        |--------------------------------------------------------------------------
        |
        | This is the fast application-level check.
        |
        | PostgreSQL remains the final authority because another request
        | can acquire the slot after this check completes.
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

                availability.reason ||
                    "The requested appointment time is not available.",

                409

            );

        }


        /*
        |--------------------------------------------------------------------------
        | Google Connection
        |--------------------------------------------------------------------------
        */

        const googleConnected =
            await GoogleService.isConnected(
                booking.client_id
            );


        if (
            !googleConnected
        ) {

            throw new AppError(
                "Google account is not connected for this business.",
                424
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Existing Calendar Event Required
        |--------------------------------------------------------------------------
        |
        | We intentionally refuse to perform a partial reschedule when the
        | original booking has no Calendar event.
        |--------------------------------------------------------------------------
        */

        if (
            !booking.google_calendar_event_id
        ) {

            throw new AppError(
                "This booking is missing its Google Calendar event. It cannot be safely rescheduled.",
                409
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Update Google Calendar First
        |--------------------------------------------------------------------------
        |
        | Calendar is changed before the database.
        |
        | If the database rejects the new slot — including PostgreSQL
        | exclusion error 23P01 — we restore the original Calendar event.
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | Update Database
        |--------------------------------------------------------------------------
        */

        let savedBooking:
            Booking;


        try {

            savedBooking =
                await BookingRepository.update(

                    booking.id!,

                    this.getDatabaseUpdates(
                        updatedBooking
                    )

                );

        }

        catch (databaseError) {

            /*
            |--------------------------------------------------------------------------
            | Database Rejected Reschedule
            |--------------------------------------------------------------------------
            |
            | This includes:
            |
            | 23P01 → appointment overlap
            |
            | The Calendar has already moved, so restore it.
            |--------------------------------------------------------------------------
            */

            await this.restoreOriginalCalendarEvent(

                booking,

                client,

                businessSettings

            );


            /*
            |--------------------------------------------------------------------------
            | Preserve Clean AppError
            |--------------------------------------------------------------------------
            |
            | BookingRepository already converts:
            |
            | 23P01 → HTTP 409
            |
            | Therefore we simply rethrow it.
            |--------------------------------------------------------------------------
            */

            throw databaseError;

        }


        /*
        |--------------------------------------------------------------------------
        | Synchronize Google Sheets
        |--------------------------------------------------------------------------
        |
        | Sheets is a projection, not the authoritative booking source.
        |
        | A Sheets failure must never undo a successful reschedule.
        |--------------------------------------------------------------------------
        */

        try {

            await GoogleSheetsService.updateBooking({

                booking:
                    savedBooking,

                client

            });

        }

        catch (sheetError) {

            console.error(
                "RESCHEDULE: Google Sheets synchronization failed. Retrying.",
                {

                    bookingId:
                        savedBooking.id,

                    clientId:
                        savedBooking.client_id,

                    error:
                        sheetError

                }
            );


            /*
            |--------------------------------------------------------------------------
            | Retry #1
            |--------------------------------------------------------------------------
            */

            try {

                await GoogleSheetsService.updateBooking({

                    booking:
                        savedBooking,

                    client

                });


            }

            catch (retryError) {

                console.error(
                    "RESCHEDULE: Google Sheets synchronization failed after retry.",
                    {

                        bookingId:
                            savedBooking.id,

                        clientId:
                            savedBooking.client_id,

                        error:
                            retryError

                    }
                );


                /*
                |--------------------------------------------------------------------------
                | Important
                |--------------------------------------------------------------------------
                |
                | Calendar + Supabase are already synchronized.
                |
                | Do NOT roll the customer's appointment back just because
                | the reporting projection failed.
                |--------------------------------------------------------------------------
                */

            }

        }


        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return savedBooking;

    }


    /*
    |--------------------------------------------------------------------------
    | Restore Original Calendar Event
    |--------------------------------------------------------------------------
    */

    private static async restoreOriginalCalendarEvent(

        booking: Booking,

        client: Client,

        businessSettings: BusinessSettings

    ): Promise<void> {

        if (
            !booking.google_calendar_event_id
        ) {

            return;

        }


        try {

            await GoogleCalendarService.updateEvent({

                clientId:
                    booking.client_id,

                booking,

                client,

                businessSettings,

                eventId:
                    booking.google_calendar_event_id

            });

        }

        catch (rollbackError) {

            /*
            |--------------------------------------------------------------------------
            | CRITICAL COMPENSATION FAILURE
            |--------------------------------------------------------------------------
            |
            | At this point the database rejected the new appointment but
            | Calendar may still contain the new time.
            |
            | Log everything required for operational recovery.
            |--------------------------------------------------------------------------
            */

            console.error(
                "RESCHEDULE CRITICAL: Failed to restore original Google Calendar event.",
                {

                    bookingId:
                        booking.id,

                    clientId:
                        booking.client_id,

                    eventId:
                        booking.google_calendar_event_id,

                    originalDate:
                        booking.appointment_date,

                    originalTime:
                        booking.appointment_time,

                    rollbackError

                }
            );


            /*
            |--------------------------------------------------------------------------
            | Do NOT replace the original database error.
            |--------------------------------------------------------------------------
            |
            | The caller should still receive the actual booking conflict.
            |--------------------------------------------------------------------------
            */

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Validate Request
    |--------------------------------------------------------------------------
    */

    private static validateRequest(

        request: RescheduleBookingRequest

    ): void {

        if (
            !request.bookingId?.trim()
        ) {

            throw new AppError(
                "Booking ID is required.",
                400
            );

        }


        if (
            !request.clientId?.trim()
        ) {

            throw new AppError(
                "Client ID is required.",
                400
            );

        }


        if (
            !request.appointment_date?.trim()
        ) {

            throw new AppError(
                "New appointment date is required.",
                400
            );

        }


        if (
            !request.appointment_time?.trim()
        ) {

            throw new AppError(
                "New appointment time is required.",
                400
            );

        }

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
            booking.status ===
            "cancelled"
        ) {

            throw new AppError(
                "Cancelled bookings cannot be rescheduled.",
                400
            );

        }


        if (
            booking.status ===
            "completed"
        ) {

            throw new AppError(
                "Completed bookings cannot be rescheduled.",
                400
            );

        }


        if (
            booking.status ===
            "no_show"
        ) {

            throw new AppError(
                "No-show bookings cannot be rescheduled.",
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
                request.appointment_date.trim(),

            appointment_time:
                request.appointment_time.trim(),


            /*
            |--------------------------------------------------------------------------
            | Keep Existing Google Calendar Event
            |--------------------------------------------------------------------------
            */

            google_calendar_event_id:
                booking.google_calendar_event_id,


            /*
            |--------------------------------------------------------------------------
            | Keep Existing Sheet Row
            |--------------------------------------------------------------------------
            */

            sheet_row:
                booking.sheet_row,


            /*
            |--------------------------------------------------------------------------
            | Optional Service Change
            |--------------------------------------------------------------------------
            */

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


    /*
    |--------------------------------------------------------------------------
    | Database Updates
    |--------------------------------------------------------------------------
    |
    | Only update appointment fields.
    |
    | Do not accidentally overwrite customer information, status,
    | timestamps, or unrelated metadata.
    |--------------------------------------------------------------------------
    */

    private static getDatabaseUpdates(

        booking: Booking

    ): Partial<Booking> {

        return {

            appointment_date:
                booking.appointment_date,

            appointment_time:
                booking.appointment_time,

            service_id:
                booking.service_id,

            service_name:
                booking.service_name,

            service_duration_minutes:
                booking.service_duration_minutes,

            service_price:
                booking.service_price,

            service_currency:
                booking.service_currency,

            google_calendar_event_id:
                booking.google_calendar_event_id,

            sheet_row:
                booking.sheet_row

        };

    }


    /*
    |--------------------------------------------------------------------------
    | Compare Appointment
    |--------------------------------------------------------------------------
    */

    private static isSameAppointment(

        current: Booking,

        updated: Booking

    ): boolean {

        return (

            current.appointment_date ===
            updated.appointment_date

            &&

            current.appointment_time ===
            updated.appointment_time

            &&

            current.service_id ===
            updated.service_id

        );

    }

}