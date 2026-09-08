import { AIRequest } from "./aiRequest";
import { AIExtractionResult } from "./aiExtractionResult";

/*
|--------------------------------------------------------------------------
| Reschedule AI Request
|--------------------------------------------------------------------------
*/

export interface RescheduleAIRequest extends AIRequest {}

/*
|--------------------------------------------------------------------------
| Reschedule AI Response
|--------------------------------------------------------------------------
*/

export interface RescheduleAIResponse extends AIExtractionResult {

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
    | Current Appointment
    |--------------------------------------------------------------------------
    */

    current_appointment_date: string;

    current_appointment_time: string;

    /*
    |--------------------------------------------------------------------------
    | New Appointment
    |--------------------------------------------------------------------------
    */

    new_appointment_date: string;

    new_appointment_time: string;

    /*
    |--------------------------------------------------------------------------
    | Reason
    |--------------------------------------------------------------------------
    */

    reason: string;

}