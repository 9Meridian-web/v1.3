import { Interval } from "luxon";

import { Booking } from "../../types/booking";
import { BusinessSettings } from "../../types/businessSettings";

import {
    AvailabilityReason,
    AvailabilityResult
} from "../../types/availability";

import { BOOKING_STATUS } from "../../constants/bookingStatus";

import { DateTimeHelper } from "../../helpers/dateTimeHelper";

export interface ConflictDetectionRequest {

    booking: Booking;

    businessSettings: BusinessSettings;

    existingBookings: Booking[];

    timezone?: string;

}

export class ConflictDetector {

    /*
    |--------------------------------------------------------------------------
    | Detect Conflict
    |--------------------------------------------------------------------------
    */

    static async detect(

        request: ConflictDetectionRequest

    ): Promise<AvailabilityResult> {

        const {

            booking,

            businessSettings,

            existingBookings,

            timezone

        } = request;

        /*
        |--------------------------------------------------------------------------
        | Requested Appointment
        |--------------------------------------------------------------------------
        */

        const requestedStart =

            DateTimeHelper.create(

                booking.appointment_date,

                booking.appointment_time,

                timezone

            );

        DateTimeHelper.ensureValid(

            requestedStart,

            "Requested Appointment"

        );

        const requestedEnd =

            requestedStart.plus({

                minutes:

                    booking.service_duration_minutes +

                    businessSettings.buffer_minutes

            });

        const requestedInterval =

            Interval.fromDateTimes(

                requestedStart,

                requestedEnd

            );

        /*
        |--------------------------------------------------------------------------
        | Existing Bookings
        |--------------------------------------------------------------------------
        */

        for (

            const existingBooking of existingBookings

        ) {

            if (

                booking.id &&

                booking.id === existingBooking.id

            ) {

                continue;

            }

            if (

                existingBooking.status ===

                BOOKING_STATUS.CANCELLED

            ) {

                continue;

            }

            const existingStart =

                DateTimeHelper.create(

                    existingBooking.appointment_date,

                    existingBooking.appointment_time,

                    timezone

                );

            DateTimeHelper.ensureValid(

                existingStart,

                "Existing Appointment"

            );

            const existingEnd =

                existingStart.plus({

                    minutes:

                        existingBooking.service_duration_minutes +

                        businessSettings.buffer_minutes

                });

            const existingInterval =

                Interval.fromDateTimes(

                    existingStart,

                    existingEnd

                );

            if (

                requestedInterval.overlaps(

                    existingInterval

                )

            ) {

                return {

                    available: false,

                    reason:

                        AvailabilityReason.SLOT_OCCUPIED,

                    suggestedSlots: []

                };

            }

        }

        /*
        |--------------------------------------------------------------------------
        | Available
        |--------------------------------------------------------------------------
        */

        return {

            available: true,

            reason:

                AvailabilityReason.AVAILABLE,

            suggestedSlots: []

        };

    }

}