/*
|--------------------------------------------------------------------------
| Booking Status
|--------------------------------------------------------------------------
*/

export type BookingStatus =

    | "pending"

    | "confirmed"

    | "completed"

    | "cancelled"

    | "no_show";


/*
|--------------------------------------------------------------------------
| Booking
|--------------------------------------------------------------------------
*/

export interface Booking {

    /*
    |--------------------------------------------------------------------------
    | Primary
    |--------------------------------------------------------------------------
    */

    id?: string;

    client_id: string;


    /*
    |--------------------------------------------------------------------------
    | Customer
    |--------------------------------------------------------------------------
    */

    customer_name: string;

    customer_phone: string;

    customer_email?: string | null;


    /*
    |--------------------------------------------------------------------------
    | Service
    |--------------------------------------------------------------------------
    |
    | service is kept for backward compatibility with older integrations.
    | service_name is the primary service field used by the current system.
    |
    */

    service?: string | null;

    service_id: string;

    service_name: string;

    service_duration_minutes: number;

    service_price: number;

    service_currency: string;


    /*
    |--------------------------------------------------------------------------
    | Appointment
    |--------------------------------------------------------------------------
    */

    appointment_date: string;

    appointment_time: string;

    status: BookingStatus;


    /*
    |--------------------------------------------------------------------------
    | Notes
    |--------------------------------------------------------------------------
    */

    reason?: string | null;

    notes?: string | null;


    /*
    |--------------------------------------------------------------------------
    | Google Integration
    |--------------------------------------------------------------------------
    */

    google_calendar_event_id?: string | null;

    sheet_row?: number | null;


    /*
    |--------------------------------------------------------------------------
    | Metadata
    |--------------------------------------------------------------------------
    */

    created_at?: string;

    updated_at?: string;

    
}