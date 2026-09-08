/*
|--------------------------------------------------------------------------
| Business Tool Input
|--------------------------------------------------------------------------
*/

export interface BusinessToolInput {

    clientId: string;

}

/*
|--------------------------------------------------------------------------
| Business Tool Output
|--------------------------------------------------------------------------
*/

export interface BusinessToolOutput {

    businessName: string;

    ownerName: string;

    email: string;

    phone?: string;

    website?: string;

    timezone: string;

    locale: string;

    openingTime: string;

    closingTime: string;

    workingDays: string[];

    appointmentDuration: number;

    bufferMinutes: number;

}