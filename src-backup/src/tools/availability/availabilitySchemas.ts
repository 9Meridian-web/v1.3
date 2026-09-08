/*
|--------------------------------------------------------------------------
| Availability Tool Input
|--------------------------------------------------------------------------
*/

export interface AvailabilityToolInput {

    clientId: string;

    appointmentDate: string;

    appointmentTime: string;

}

/*
|--------------------------------------------------------------------------
| Availability Tool Output
|--------------------------------------------------------------------------
*/

export interface AvailabilityToolOutput {

    available: boolean;

    reason: string;

    suggestedSlots: string[];

}