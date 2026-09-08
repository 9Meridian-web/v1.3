import { Booking } from "../types/booking";

export class BookingMapper {

    /*
    |--------------------------------------------------------------------------
    | Database -> Booking
    |--------------------------------------------------------------------------
    */

    static fromDatabase(

        row: any

    ): Booking {

        return {

            /*
            |--------------------------------------------------------------------------
            | Primary
            |--------------------------------------------------------------------------
            */

            id:

                row.id,

            client_id:

                row.client_id,

            /*
            |--------------------------------------------------------------------------
            | Customer
            |--------------------------------------------------------------------------
            */

            customer_name:

                row.customer_name,

            customer_email:

                row.customer_email,

            customer_phone:

                row.customer_phone,

            /*
            |--------------------------------------------------------------------------
            | Appointment
            |--------------------------------------------------------------------------
            */

            appointment_date:

                row.appointment_date,

            appointment_time:

                row.appointment_time,

            service_id:

                row.service_id,

            service_name:

                row.service_name,

            service_duration_minutes:

                row.service_duration_minutes,

            service_price:

                row.service_price,

            service_currency:

                row.service_currency,

            reason:

                row.reason,

            notes:

                row.notes,

            status:

                row.status,

            /*
            |--------------------------------------------------------------------------
            | Google
            |--------------------------------------------------------------------------
            */

            google_calendar_event_id:

                row.google_calendar_event_id,

            sheet_row:

                row.sheet_row,

            /*
            |--------------------------------------------------------------------------
            | Metadata
            |--------------------------------------------------------------------------
            */

            created_at:

                row.created_at,

            updated_at:

                row.updated_at

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Booking -> Database
    |--------------------------------------------------------------------------
    */

    static toDatabase(

        booking: Booking

    ) {

        return {

            id:

                booking.id,

            client_id:

                booking.client_id,

            customer_name:

                booking.customer_name,

            customer_email:

                booking.customer_email,

            customer_phone:

                booking.customer_phone,

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

            reason:

                booking.reason,

            notes:

                booking.notes,

            status:

                booking.status,

            google_calendar_event_id:

                booking.google_calendar_event_id,

            sheet_row:

                booking.sheet_row,

            created_at:

                booking.created_at,

            updated_at:

                booking.updated_at

        };

    }

}