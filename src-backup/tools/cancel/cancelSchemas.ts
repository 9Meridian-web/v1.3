/*
|--------------------------------------------------------------------------
| Cancel Tool Input
|--------------------------------------------------------------------------
*/

export interface CancelToolInput {

    bookingId: string;

}

/*
|--------------------------------------------------------------------------
| Cancel Tool Output
|--------------------------------------------------------------------------
*/

export interface CancelToolOutput {

    success: boolean;

    bookingId: string;

    message: string;

}