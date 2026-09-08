export enum BookingStatus {

    BOOKED = "BOOKED",

    SLOT_UNAVAILABLE = "SLOT_UNAVAILABLE",

    OUTSIDE_BUSINESS_HOURS = "OUTSIDE_BUSINESS_HOURS",

    NON_WORKING_DAY = "NON_WORKING_DAY",

    HOLIDAY = "HOLIDAY",

    INVALID_REQUEST = "INVALID_REQUEST",

    ERROR = "ERROR"

}

export interface BookingResult {

    success: boolean;

    status: BookingStatus;

    bookingId?: string;

    suggestions?: string[];

}