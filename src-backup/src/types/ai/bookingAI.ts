import { AIExtractionResult } from "./aiExtractionResult";

/*
|--------------------------------------------------------------------------
| Booking AI Request
|--------------------------------------------------------------------------
|
| Input passed to the Booking AI Service.
|
*/

export interface BookingAIRequest {

    /*
    |--------------------------------------------------------------------------
    | Client
    |--------------------------------------------------------------------------
    */

    clientId: string;

    /*
    |--------------------------------------------------------------------------
    | User Message
    |--------------------------------------------------------------------------
    */

    message: string;

}

/*
|--------------------------------------------------------------------------
| Booking AI Response
|--------------------------------------------------------------------------
|
| Structured booking information extracted by AI.
|
*/

export interface BookingAIResponse

    extends AIExtractionResult {

    /*
    |--------------------------------------------------------------------------
    | Customer
    |--------------------------------------------------------------------------
    */

    customer_name: string;

    customer_phone: string;

    customer_email: string;

    /*
    |--------------------------------------------------------------------------
    | Appointment
    |--------------------------------------------------------------------------
    */

    appointment_date: string;

    appointment_time: string;

    service: string;

    notes: string;

}