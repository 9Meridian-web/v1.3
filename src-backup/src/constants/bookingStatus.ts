import { BookingStatus } from "../types/booking";

export const BOOKING_STATUS = {

    CONFIRMED: "confirmed",

    CANCELLED: "cancelled",

    COMPLETED: "completed",

    NO_SHOW: "no_show"

} as const satisfies Record<string, BookingStatus>;