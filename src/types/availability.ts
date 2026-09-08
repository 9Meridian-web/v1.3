export enum AvailabilityReason {

    AVAILABLE = "AVAILABLE",

    BUSINESS_CLOSED = "BUSINESS_CLOSED",

    OUTSIDE_BUSINESS_HOURS = "OUTSIDE_BUSINESS_HOURS",

    HOLIDAY = "HOLIDAY",

    LUNCH_BREAK = "LUNCH_BREAK",

    SLOT_OCCUPIED = "SLOT_OCCUPIED",

    MAX_BOOKINGS_REACHED = "MAX_BOOKINGS_REACHED"

}

export interface AvailabilityResult {

    available: boolean;

    reason: AvailabilityReason;

    suggestedSlots: string[];

}