import { AIExtractionResult } from "./aiExtractionResult";

/*
|--------------------------------------------------------------------------
| Availability AI Request
|--------------------------------------------------------------------------
|
| Input passed to the Availability AI Service.
|
*/

export interface AvailabilityAIRequest {

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
| Availability AI Response
|--------------------------------------------------------------------------
|
| Structured availability information extracted by AI.
|
*/

export interface AvailabilityAIResponse

    extends AIExtractionResult {

    /*
    |--------------------------------------------------------------------------
    | Appointment
    |--------------------------------------------------------------------------
    */

    appointment_date: string;

    appointment_time: string;

}