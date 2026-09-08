import { AppError } from "../../errors/AppError";

import { Booking } from "../../types/booking";
import { Client } from "../../types/client";
import { Service } from "../../types/service";
import { BusinessSettings } from "../../types/businessSettings";

import { BookingRepository } from "../../repositories/bookingRepository";

import { ClientService } from "../clients/clientService";
import { ServiceService } from "../serviceService";
import { BusinessSettingsService } from "../business/businessSettingsService";

import { AvailabilityService } from "../availability/availabilityService";

import { GoogleSheetsService } from "../google/googleSheetsService";
import { GoogleCalendarService } from "../google/googleCalendarService";
import { GoogleService } from "../google/googleService";


/*
|--------------------------------------------------------------------------
| Create Booking Request
|--------------------------------------------------------------------------
*/

export interface CreateBookingRequest {

    client_id: string;

    customer_name: string;

    customer_phone: string;

    customer_email?: string;

    appointment_date: string;

    appointment_time: string;

    service_id: string;

    reason?: string;

    notes?: string;

}


/*
|--------------------------------------------------------------------------
| Safe Booking Update
|--------------------------------------------------------------------------
|
| These are the fields that can safely be edited without changing the
| appointment slot, service configuration, payment state, or integrations.
|--------------------------------------------------------------------------
*/

export type SafeBookingUpdate = Pick<
    Partial<Booking>,
    | "customer_name"
    | "customer_phone"
    | "customer_email"
    | "reason"
    | "notes"
>;


/*
|--------------------------------------------------------------------------
| Booking Service
|--------------------------------------------------------------------------
*/

export class BookingService {


    /*
    |--------------------------------------------------------------------------
    | Create Booking
    |--------------------------------------------------------------------------
    */

    static async create(
        request: CreateBookingRequest
    ): Promise<Booking> {

        /*
        |--------------------------------------------------------------------------
        | Validate Client ID
        |--------------------------------------------------------------------------
        */

        if (
            !request.client_id?.trim()
        ) {

            throw new AppError(
                "Client ID is required.",
                400
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Google Connection
        |--------------------------------------------------------------------------
        |
        | Google Calendar + Sheets are required for production bookings.
        |--------------------------------------------------------------------------
        */

        const googleConnected =
            await GoogleService.isConnected(
                request.client_id
            );


        if (!googleConnected) {

            throw new AppError(
                "Google account is not connected for this business.",
                424
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Load Dependencies
        |--------------------------------------------------------------------------
        */

        const client =
            await this.getClient(
                request.client_id
            );


        const businessSettings =
            await this.getBusinessSettings(
                request.client_id
            );


        const service =
            await this.getService(
                request.service_id
            );


        /*
        |--------------------------------------------------------------------------
        | Validate Ownership
        |--------------------------------------------------------------------------
        */

        this.validateOwnership(
            client,
            service
        );


        this.validateService(
            service,
            request.client_id
        );


        /*
        |--------------------------------------------------------------------------
        | Build Booking
        |--------------------------------------------------------------------------
        */

        const booking =
            this.buildBooking(
                request,
                service
            );


        /*
        |--------------------------------------------------------------------------
        | Validate Appointment
        |--------------------------------------------------------------------------
        */

        this.validateAppointment(
            booking
        );


        /*
        |--------------------------------------------------------------------------
        | Availability
        |--------------------------------------------------------------------------
        */

        const availability =
            await AvailabilityService.checkAvailability({

                booking,

                client,

                businessSettings

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
        | Complete Booking
        |--------------------------------------------------------------------------
        */

        return await this.completeBooking(

            booking,

            client,

            businessSettings

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Complete Booking
    |--------------------------------------------------------------------------
    |
    | Authoritative order:
    |
    | 1. Supabase booking
    | 2. Google Calendar event
    | 3. Save Calendar event ID
    | 4. Google Sheets synchronization
    |
    | Supabase + Calendar represent the real appointment.
    |
    | Sheets is a synchronized reporting layer.
    |--------------------------------------------------------------------------
    */

    private static async completeBooking(

        booking: Booking,

        client: Client,

        businessSettings: BusinessSettings

    ): Promise<Booking> {

        let createdBooking:
            Booking | null = null;


        let calendarEventId:
            string | null = null;


        try {

            /*
            |--------------------------------------------------------------------------
            | Step 1 — Create Database Booking
            |--------------------------------------------------------------------------
            */

            createdBooking =
                await BookingRepository.create(
                    booking
                );


            if (
                !createdBooking.id
            ) {

                throw new AppError(
                    "Booking was created without a valid booking ID.",
                    500
                );

            }


            /*
            |--------------------------------------------------------------------------
            | Step 2 — Create Google Calendar Event
            |--------------------------------------------------------------------------
            */

            const calendarEvent =
                await GoogleCalendarService.createEvent({

                    booking:
                        createdBooking,

                    client,

                    businessSettings

                });


            if (
                !calendarEvent?.eventId
            ) {

                throw new AppError(
                    "Google Calendar event was not created.",
                    502
                );

            }


            calendarEventId =
                calendarEvent.eventId;


            /*
            |--------------------------------------------------------------------------
            | Step 3 — Save Calendar Event ID
            |--------------------------------------------------------------------------
            */

            createdBooking =
                await BookingRepository.update(

                    createdBooking.id,

                    {

                        google_calendar_event_id:
                            calendarEvent.eventId

                    }

                );


            /*
            |--------------------------------------------------------------------------
            | Step 4 — Synchronize Google Sheets
            |--------------------------------------------------------------------------
            |
            | Sheets failure MUST NOT destroy a valid appointment.
            |--------------------------------------------------------------------------
            */

            const sheetSynced =
                await this.syncGoogleSheet(

                    createdBooking,

                    client

                );


            if (
                !sheetSynced
            ) {

                console.error(
                    "BOOKING: Google Sheets synchronization failed after retries.",
                    {

                        bookingId:
                            createdBooking.id,

                        clientId:
                            createdBooking.client_id

                    }
                );

            }


            /*
            |--------------------------------------------------------------------------
            | Success
            |--------------------------------------------------------------------------
            */

            return createdBooking;

        }

        catch (error) {

            /*
            |--------------------------------------------------------------------------
            | Rollback Only Authoritative Booking Creation
            |--------------------------------------------------------------------------
            */

            await this.rollbackFailedBooking(

                createdBooking,

                calendarEventId

            );


            throw error;

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Google Sheets Synchronization
    |--------------------------------------------------------------------------
    */

    private static async syncGoogleSheet(

        booking: Booking,

        client: Client

    ): Promise<boolean> {

        const maxAttempts =
            3;


        for (
            let attempt = 1;
            attempt <= maxAttempts;
            attempt++
        ) {

            try {

                await GoogleSheetsService.appendBooking({

                    booking,

                    client

                });


                return true;

            }

            catch (error) {

                console.error(

                    "BOOKING: Google Sheets synchronization attempt failed.",

                    {

                        bookingId:
                            booking.id,

                        attempt,

                        maxAttempts,

                        error

                    }

                );


                if (
                    attempt ===
                    maxAttempts
                ) {

                    break;

                }


                /*
                |--------------------------------------------------------------------------
                | Exponential Backoff
                |--------------------------------------------------------------------------
                */

                await this.delay(

                    attempt * 1000

                );

            }

        }


        return false;

    }


    /*
    |--------------------------------------------------------------------------
    | Rollback Failed Booking
    |--------------------------------------------------------------------------
    */

    private static async rollbackFailedBooking(

        booking: Booking | null,

        eventId: string | null

    ): Promise<void> {

        /*
        |--------------------------------------------------------------------------
        | Delete Calendar Event
        |--------------------------------------------------------------------------
        */

        if (
            booking?.client_id &&
            eventId
        ) {

            try {

                await GoogleCalendarService.deleteEvent(

                    booking.client_id,

                    eventId

                );

            }

            catch (error) {

                console.error(

                    "BOOKING ROLLBACK: Failed to delete Google Calendar event.",

                    {

                        bookingId:
                            booking.id,

                        eventId,

                        error

                    }

                );

            }

        }


        /*
        |--------------------------------------------------------------------------
        | Delete Database Booking
        |--------------------------------------------------------------------------
        */

        if (
            booking?.id
        ) {

            try {

                await BookingRepository.delete(

                    booking.id

                );

            }

            catch (error) {

                console.error(

                    "BOOKING ROLLBACK: Failed to delete database booking.",

                    {

                        bookingId:
                            booking.id,

                        error

                    }

                );

            }

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Delay
    |--------------------------------------------------------------------------
    */

    private static async delay(
        milliseconds: number
    ): Promise<void> {

        await new Promise<void>(

            resolve =>

                setTimeout(
                    resolve,
                    milliseconds
                )

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Validate Service
    |--------------------------------------------------------------------------
    */

    private static validateService(

        service: Service,

        clientId: string

    ): void {

        if (
            service.client_id !==
            clientId
        ) {

            throw new AppError(
                "Invalid service selected.",
                400
            );

        }


        if (
            !service.is_active
        ) {

            throw new AppError(
                "This service is unavailable.",
                400
            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Build Booking
    |--------------------------------------------------------------------------
    */

    private static buildBooking(

        request: CreateBookingRequest,

        service: Service

    ): Booking {

        return {

            client_id:
                request.client_id,

            customer_name:
                request.customer_name.trim(),

            customer_phone:
                request.customer_phone.trim(),

            customer_email:
                request.customer_email?.trim() ??
                null,

            service_id:
                service.id!,

            service_name:
                service.name,

            service_duration_minutes:
                service.duration_minutes,

            service_price:
                service.price,

            service_currency:
                service.currency,

            appointment_date:
                request.appointment_date.trim(),

            appointment_time:
                request.appointment_time.trim(),

            reason:
                request.reason?.trim() ??
                null,

            notes:
                request.notes?.trim() ??
                null,

            status:
                "confirmed"

        };

    }


    /*
    |--------------------------------------------------------------------------
    | Get Booking
    |--------------------------------------------------------------------------
    */

    static async get(
        bookingId: string
    ): Promise<Booking> {

        return await BookingRepository.findById(
            bookingId
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Get Booking For Client
    |--------------------------------------------------------------------------
    */

    static async getForClient(

        bookingId: string,

        clientId: string

    ): Promise<Booking> {

        return await BookingRepository.findByIdForClient(

            bookingId,

            clientId

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Get Client Bookings
    |--------------------------------------------------------------------------
    */

    static async getAll(

        clientId: string

    ): Promise<Booking[]> {

        return await BookingRepository.findByClient(

            clientId

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Cancel Booking
    |--------------------------------------------------------------------------
    |
    | NOTE:
    | The dedicated CancelBookingService is the preferred cancellation
    | path. This method is retained for backward compatibility.
    |--------------------------------------------------------------------------
    */

    static async cancel(

        bookingId: string

    ): Promise<Booking> {

        const booking =
            await BookingRepository.findById(
                bookingId
            );


        this.validateStatus(
            booking
        );


        const client =
            await ClientService.get(
                booking.client_id
            );


        /*
        |--------------------------------------------------------------------------
        | Delete Calendar Event
        |--------------------------------------------------------------------------
        */

        if (
            booking.google_calendar_event_id
        ) {

            await GoogleCalendarService.deleteEvent(

                booking.client_id,

                booking.google_calendar_event_id

            );

        }


        /*
        |--------------------------------------------------------------------------
        | Cancel Database Booking
        |--------------------------------------------------------------------------
        */

        const cancelledBooking =
            await BookingRepository.cancel(

                bookingId

            );


        /*
        |--------------------------------------------------------------------------
        | Synchronize Google Sheets
        |--------------------------------------------------------------------------
        */

        try {

            await GoogleSheetsService.deleteBooking({

                booking:
                    cancelledBooking,

                client

            });

        }

        catch (error) {

            /*
            |--------------------------------------------------------------------------
            | Do not reverse a successful cancellation because Sheets
            | temporarily failed.
            |--------------------------------------------------------------------------
            */

            console.error(

                "CANCELLATION: Google Sheets synchronization failed.",

                {

                    bookingId:
                        cancelledBooking.id,

                    clientId:
                        cancelledBooking.client_id,

                    error

                }

            );

        }


        return cancelledBooking;

    }


    /*
    |--------------------------------------------------------------------------
    | Update Booking
    |--------------------------------------------------------------------------
    |
    | Generic updates are deliberately restricted.
    |
    | Appointment scheduling changes MUST go through
    | RescheduleBookingService.
    |--------------------------------------------------------------------------
    */

    static async update(

        bookingId: string,

        updates: Partial<Booking>

    ): Promise<Booking> {

        this.validateSafeUpdate(
            updates
        );


        return await BookingRepository.update(

            bookingId,

            this.cleanSafeUpdates(
                updates
            )

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Update Booking For Client
    |--------------------------------------------------------------------------
    |
    | This is the endpoint-facing update method.
    |
    | It cannot modify:
    |
    | - appointment date
    | - appointment time
    | - service
    | - status
    | - client ownership
    | - Calendar event ID
    | - Google Sheets row
    |
    | Scheduling changes must use RescheduleBookingService.
    |--------------------------------------------------------------------------
    */

    static async updateForClient(

        bookingId: string,

        clientId: string,

        updates: Partial<Booking>

    ): Promise<Booking> {

        this.validateSafeUpdate(
            updates
        );


        const booking =
            await BookingRepository.findByIdForClient(

                bookingId,

                clientId

            );


        this.validateStatus(
            booking
        );


        const safeUpdates =
            this.cleanSafeUpdates(
                updates
            );


        if (
            Object.keys(
                safeUpdates
            ).length === 0
        ) {

            throw new AppError(
                "No editable booking fields were provided.",
                400
            );

        }


        return await BookingRepository.updateForClient(

            bookingId,

            clientId,

            safeUpdates

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Validate Safe Update
    |--------------------------------------------------------------------------
    */

    private static validateSafeUpdate(

        updates: Partial<Booking>

    ): void {

        if (
            !updates ||
            Object.keys(updates).length === 0
        ) {

            throw new AppError(
                "At least one booking update is required.",
                400
            );

        }


        const protectedFields = [

            "client_id",

            "appointment_date",

            "appointment_time",

            "service_id",

            "service_name",

            "service",

            "service_duration_minutes",

            "service_price",

            "service_currency",

            "status",

            "google_calendar_event_id",

            "sheet_row",

            "created_at",

            "updated_at"

        ];


        const attemptedProtectedFields =
            Object.keys(updates).filter(

                field =>
                    protectedFields.includes(
                        field
                    )

            );


        if (
            attemptedProtectedFields.length > 0
        ) {

            throw new AppError(

                "Appointment scheduling fields cannot be changed through the generic update endpoint. Use the reschedule endpoint for date, time, or service changes.",

                400

            );

        }


        const allowedFields = [

            "customer_name",

            "customer_phone",

            "customer_email",

            "reason",

            "notes"

        ];


        const attemptedUnknownFields =
            Object.keys(updates).filter(

                field =>
                    !allowedFields.includes(
                        field
                    )

            );


        if (
            attemptedUnknownFields.length > 0
        ) {

            throw new AppError(

                `Unsupported booking update field: ${attemptedUnknownFields[0]}.`,

                400

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Clean Safe Updates
    |--------------------------------------------------------------------------
    */

    private static cleanSafeUpdates(

        updates: Partial<Booking>

    ): SafeBookingUpdate {

        const safeUpdates:
            SafeBookingUpdate = {};


        if (
            updates.customer_name !==
            undefined
        ) {

            const value =
                String(
                    updates.customer_name
                ).trim();


            if (!value) {

                throw new AppError(
                    "Customer name cannot be empty.",
                    400
                );

            }


            safeUpdates.customer_name =
                value;

        }


        if (
            updates.customer_phone !==
            undefined
        ) {

            const value =
                String(
                    updates.customer_phone
                ).trim();


            if (!value) {

                throw new AppError(
                    "Customer phone cannot be empty.",
                    400
                );

            }


            safeUpdates.customer_phone =
                value;

        }


        if (
            updates.customer_email !==
            undefined
        ) {

            const value =
                updates.customer_email === null
                    ? null
                    : String(
                        updates.customer_email
                    ).trim();


            safeUpdates.customer_email =
                value;

        }


        if (
            updates.reason !==
            undefined
        ) {

            safeUpdates.reason =
                updates.reason === null
                    ? null
                    : String(
                        updates.reason
                    ).trim();

        }


        if (
            updates.notes !==
            undefined
        ) {

            safeUpdates.notes =
                updates.notes === null
                    ? null
                    : String(
                        updates.notes
                    ).trim();

        }


        return safeUpdates;

    }


    /*
    |--------------------------------------------------------------------------
    | Delete Booking
    |--------------------------------------------------------------------------
    */

    static async delete(

        bookingId: string

    ): Promise<void> {

        const booking =
            await BookingRepository.findById(

                bookingId

            );


        /*
        |--------------------------------------------------------------------------
        | Delete Calendar Event
        |--------------------------------------------------------------------------
        */

        if (
            booking.google_calendar_event_id
        ) {

            await GoogleCalendarService.deleteEvent(

                booking.client_id,

                booking.google_calendar_event_id

            );

        }


        /*
        |--------------------------------------------------------------------------
        | Delete Database Booking
        |--------------------------------------------------------------------------
        */

        await BookingRepository.delete(

            bookingId

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Delete Booking For Client
    |--------------------------------------------------------------------------
    */

    static async deleteForClient(

        bookingId: string,

        clientId: string

    ): Promise<void> {

        const booking =
            await BookingRepository.findByIdForClient(

                bookingId,

                clientId

            );


        if (
            booking.google_calendar_event_id
        ) {

            await GoogleCalendarService.deleteEvent(

                booking.client_id,

                booking.google_calendar_event_id

            );

        }


        await BookingRepository.deleteForClient(

            bookingId,

            clientId

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Get Client
    |--------------------------------------------------------------------------
    */

    private static async getClient(

        clientId: string

    ): Promise<Client> {

        return await ClientService.get(

            clientId

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Get Business Settings
    |--------------------------------------------------------------------------
    */

    private static async getBusinessSettings(

        clientId: string

    ): Promise<BusinessSettings> {

        return await BusinessSettingsService.get(

            clientId

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Get Service
    |--------------------------------------------------------------------------
    */

    private static async getService(

        serviceId: string

    ): Promise<Service> {

        return await ServiceService.get(

            serviceId

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Validate Client Ownership
    |--------------------------------------------------------------------------
    */

    private static validateOwnership(

        client: Client,

        service: Service

    ): void {

        if (
            client.id !==
            service.client_id
        ) {

            throw new AppError(

                "Selected service does not belong to this client.",

                400

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Validate Appointment
    |--------------------------------------------------------------------------
    */

    private static validateAppointment(

        booking: Booking

    ): void {

        if (
            !booking.customer_name.trim()
        ) {

            throw new AppError(

                "Customer name is required.",

                400

            );

        }


        if (
            !booking.customer_phone.trim()
        ) {

            throw new AppError(

                "Customer phone is required.",

                400

            );

        }


        if (
            !booking.appointment_date
        ) {

            throw new AppError(

                "Appointment date is required.",

                400

            );

        }


        if (
            !booking.appointment_time
        ) {

            throw new AppError(

                "Appointment time is required.",

                400

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Validate Booking Status
    |--------------------------------------------------------------------------
    */

    private static validateStatus(

        booking: Booking

    ): void {

        if (
            booking.status ===
            "cancelled"
        ) {

            throw new AppError(

                "Cancelled bookings cannot be modified.",

                400

            );

        }


        if (
            booking.status ===
            "completed"
        ) {

            throw new AppError(

                "Completed bookings cannot be modified.",

                400

            );

        }

    }

}