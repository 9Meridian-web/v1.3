import { Booking } from "../../types/booking";
import { Client } from "../../types/client";
import { BusinessSettings } from "../../types/businessSettings";

import {
    AvailabilityResult
} from "../../types/availability";

import { BookingRepository } from "../../repositories/bookingRepository";

import { ScheduleValidator } from "../availability/scheduleValidator";
import { ConflictDetector } from "../availability/conflictDetector";
import { SuggestionService } from "../availability/suggestionService";

export interface AvailabilityRequest {

    booking: Booking;

    client: Client;

    businessSettings: BusinessSettings;

    excludeBookingId?: string;

}

export class AvailabilityService {

    /*
    |--------------------------------------------------------------------------
    | Check Availability
    |--------------------------------------------------------------------------
    */

    static async checkAvailability(

        request: AvailabilityRequest

    ): Promise<AvailabilityResult> {

        const {

            booking,

            client,

            businessSettings,

            excludeBookingId

        } = request;

        /*
        |--------------------------------------------------------------------------
        | Existing Bookings
        |--------------------------------------------------------------------------
        */

        const existingBookings =

            await BookingRepository.findByDate(

                booking.client_id,

                booking.appointment_date,

                excludeBookingId

            );

        /*
        |--------------------------------------------------------------------------
        | Validate Schedule
        |--------------------------------------------------------------------------
        */

        const scheduleValidation =

            await ScheduleValidator.validate({

                booking,

                businessSettings,

                timezone:

                    client.timezone

            });

        if (

            !scheduleValidation.available

        ) {

            return scheduleValidation;

        }

        /*
        |--------------------------------------------------------------------------
        | Detect Conflicts
        |--------------------------------------------------------------------------
        */

        const conflictValidation =

            await ConflictDetector.detect({

                booking,

                businessSettings,

                existingBookings,

                timezone:

                    client.timezone

            });

        if (

            !conflictValidation.available

        ) {

            return conflictValidation;

        }

        /*
        |--------------------------------------------------------------------------
        | Suggestions
        |--------------------------------------------------------------------------
        */

        const suggestedSlots =

            await SuggestionService.generate({

                booking,

                businessSettings,

                existingBookings,

                timezone:

                    client.timezone

            });

        /*
        |--------------------------------------------------------------------------
        | Available
        |--------------------------------------------------------------------------
        */

        return {

            available: true,

            reason:

                conflictValidation.reason,

            suggestedSlots

        };

    }

}