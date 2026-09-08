import { AIExtractionResult } from "./aiExtractionResult";
import { AIRequest } from "./aiRequest";

/*
|--------------------------------------------------------------------------
| AI Intent
|--------------------------------------------------------------------------
*/

export type AIIntent =

    | "booking"
    | "availability"
    | "cancel"
    | "reschedule"
    | "unknown";

/*
|--------------------------------------------------------------------------
| Intent AI Request
|--------------------------------------------------------------------------
*/

export interface IntentAIRequest

    extends AIRequest {

}

/*
|--------------------------------------------------------------------------
| Intent AI Response
|--------------------------------------------------------------------------
*/

export interface IntentAIResponse

    extends AIExtractionResult {

    /*
    |--------------------------------------------------------------------------
    | Detected Intent
    |--------------------------------------------------------------------------
    */

    intent: AIIntent;

}