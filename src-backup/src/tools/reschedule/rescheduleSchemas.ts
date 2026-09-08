/*
|--------------------------------------------------------------------------
| Reschedule Tool Input
|--------------------------------------------------------------------------
*/

export interface RescheduleToolInput {

    bookingId: string;

    appointmentDate: string;

    appointmentTime: string;

}

/*
|--------------------------------------------------------------------------
| Reschedule Tool Output
|--------------------------------------------------------------------------
*/

export interface RescheduleToolOutput {

    success: boolean;

    bookingId: string;

    customerName: string;

    appointmentDate: string;

    appointmentTime: string;

    status: string;

    message: string;

}