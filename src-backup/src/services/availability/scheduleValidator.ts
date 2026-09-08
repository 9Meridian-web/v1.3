import {
    AvailabilityReason,
    AvailabilityResult
} from "../../types/availability";

import { Booking } from "../../types/booking";
import { BusinessSettings } from "../../types/businessSettings";

import { DateTimeHelper } from "../../helpers/dateTimeHelper";

export interface ScheduleValidationRequest {

    booking: Booking;

    businessSettings: BusinessSettings;

    timezone?: string;

}

export class ScheduleValidator {

    /*
    |--------------------------------------------------------------------------
    | Validate Schedule
    |--------------------------------------------------------------------------
    */

    static async validate(

        request: ScheduleValidationRequest

    ): Promise<AvailabilityResult> {

        const {

            booking,

            businessSettings,

            timezone

        } = request;

        const workingDay =

            this.validateWorkingDay(

                booking,

                businessSettings,

                timezone

            );

        if (

            !workingDay.available

        ) {

            return workingDay;

        }

        const businessHours =

            this.validateBusinessHours(

                booking,

                businessSettings,

                timezone

            );

        if (

            !businessHours.available

        ) {

            return businessHours;

        }

        return {

            available: true,

            reason: AvailabilityReason.AVAILABLE,

            suggestedSlots: []

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Working Day
    |--------------------------------------------------------------------------
    */

    private static validateWorkingDay(

        booking: Booking,

        businessSettings: BusinessSettings,

        timezone?: string

    ): AvailabilityResult {

        const day =

            DateTimeHelper.getWeekday(

                booking.appointment_date,

                timezone

            );

        if (

            !businessSettings.working_days.includes(

                day

            )

        ) {

            return {

                available: false,

                reason:

                    AvailabilityReason.BUSINESS_CLOSED,

                suggestedSlots: []

            };

        }

        return {

            available: true,

            reason:

                AvailabilityReason.AVAILABLE,

            suggestedSlots: []

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Business Hours
    |--------------------------------------------------------------------------
    */

    private static validateBusinessHours(

        booking: Booking,

        businessSettings: BusinessSettings,

        timezone?: string

    ): AvailabilityResult {

        const appointment =

            DateTimeHelper.create(

                booking.appointment_date,

                booking.appointment_time,

                timezone

            );

        const opening =

            DateTimeHelper.create(

                booking.appointment_date,

                businessSettings.opening_time,

                timezone

            );

        const closing =

            DateTimeHelper.create(

                booking.appointment_date,

                businessSettings.closing_time,

                timezone

            );

        const appointmentEnd =

            appointment.plus({

                minutes:

                    businessSettings.appointment_duration

            });

        if (

            appointment < opening ||

            appointmentEnd > closing

        ) {

            return {

                available: false,

                reason:

                    AvailabilityReason.OUTSIDE_BUSINESS_HOURS,

                suggestedSlots: []

            };

        }

        return {

            available: true,

            reason:

                AvailabilityReason.AVAILABLE,

            suggestedSlots: []

        };

    }

}