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
        | Validate Ownership / Service
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

                availability.reason,

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
    */

    private static async completeBooking(

        booking: Booking,

        client: Client,

        businessSettings: BusinessSettings

    ): Promise<Booking> {

        void client;
        void businessSettings;

        let createdBooking: Booking | null = null;

        try {

            /*
            |--------------------------------------------------------------------------
            | Create Database Booking
            |--------------------------------------------------------------------------
            */

            createdBooking =

                await BookingRepository.create(

                    booking

                );

            return createdBooking;

        }

        catch (error) {

            await this.rollback(

                createdBooking,

                null

            );

            throw error;

        }

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

            service.client_id !== clientId

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

                request.customer_name,

            customer_phone:

                request.customer_phone,

            customer_email:

                request.customer_email ?? null,

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

                request.appointment_date,

            appointment_time:

                request.appointment_time,

            reason:

                request.reason ?? null,

            notes:

                request.notes ?? null,

            status:

                "confirmed"

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Rollback
    |--------------------------------------------------------------------------
    */

    private static async rollback(

        booking: Booking | null,

        eventId: string | null

    ): Promise<void> {

        try {

            /*
            |--------------------------------------------------------------------------
            | Delete Calendar Event
            |--------------------------------------------------------------------------
            */

            if (

                booking &&

                eventId

            ) {

                await GoogleCalendarService.deleteEvent(

                    booking.client_id,

                    eventId

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Delete Database Booking
            |--------------------------------------------------------------------------
            */

            if (

                booking?.id

            ) {

                await BookingRepository.delete(

                    booking.id

                );

            }

        }

        catch (rollbackError) {

            console.error(

                "BOOKING ROLLBACK FAILED",

                rollbackError

            );

        }

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
    */

    static async cancel(

        bookingId: string

    ): Promise<Booking> {

        const booking =

            await BookingRepository.findById(

                bookingId

            );

        if (

            booking.status === "cancelled"

        ) {

            throw new AppError(

                "Booking is already cancelled.",

                400

            );

        }

        const client =

            await ClientService.get(

                booking.client_id

            );

        /*
        |--------------------------------------------------------------------------
        | Google Calendar
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
        | Database
        |--------------------------------------------------------------------------
        */

        const cancelledBooking =

            await BookingRepository.cancel(

                bookingId

            );

        /*
        |--------------------------------------------------------------------------
        | Google Sheets
        |--------------------------------------------------------------------------
        */

        await GoogleSheetsService.deleteBooking({

            booking: cancelledBooking,

            client

        });

        return cancelledBooking;

    }

    /*
    |--------------------------------------------------------------------------
    | Update Booking
    |--------------------------------------------------------------------------
    */

    static async update(

        bookingId: string,

        updates: Partial<Booking>

    ): Promise<Booking> {

        return await BookingRepository.update(

            bookingId,

            updates

        );

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

        if (

            booking.google_calendar_event_id

        ) {

            await GoogleCalendarService.deleteEvent(

                booking.client_id,

                booking.google_calendar_event_id

            );

        }

        await BookingRepository.delete(

            bookingId

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

            client.id !== service.client_id

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

            booking.status === "cancelled"

        ) {

            throw new AppError(

                "Cancelled bookings cannot be modified.",

                400

            );

        }

        if (

            booking.status === "completed"

        ) {

            throw new AppError(

                "Completed bookings cannot be modified.",

                400

            );

        }

    }

}