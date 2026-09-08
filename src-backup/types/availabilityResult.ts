export enum AvailabilityReason {

    AVAILABLE = "AVAILABLE",

    OUTSIDE_BUSINESS_HOURS = "OUTSIDE_BUSINESS_HOURS",

    NON_WORKING_DAY = "NON_WORKING_DAY",

    OVERLAP = "OVERLAP",

    HOLIDAY = "HOLIDAY"

}

export interface AvailabilityResult {

    available: boolean;

    reason: AvailabilityReason;

}