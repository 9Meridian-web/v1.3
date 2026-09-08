import { Booking } from "../../types/booking";
import { Client } from "../../types/client";
import { BusinessSettings } from "../../types/businessSettings";

import {
    AvailabilityReason,
    AvailabilityResult
} from "../../types/availability";

import { BookingRepository } from "../../repositories/bookingRepository";

import { ScheduleValidator } from "../availability/scheduleValidator";
import { ConflictDetector } from "../availability/conflictDetector";
import { SuggestionService } from "../availability/suggestionService";

import { GoogleCalendarService } from "../google/googleCalendarService";
import { GoogleService } from "../google/googleService";

import { DateTimeHelper } from "../../helpers/dateTimeHelper";


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
        | Existing Supabase Bookings
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
        | Validate Business Schedule
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
        | Detect Supabase Booking Conflicts
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
        | Google Calendar Conflict Check
        |--------------------------------------------------------------------------
        |
        | This is the important production check.
        |
        | Supabase tells us about bookings created through our system.
        |
        | Google Calendar tells us about events that may have been
        | created manually by the business owner/staff.
        |
        | Both must be clear before we tell the customer the slot
        | is available.
        |--------------------------------------------------------------------------
        */

        const googleConnected =

            await GoogleService.isConnected(

                booking.client_id

            );


        /*
        |----------------------------------------------------------------------
        | If Google is connected, check the real Calendar.
        |----------------------------------------------------------------------
        */

        if (googleConnected) {

            const requestedStart =

                DateTimeHelper.create(

                    booking.appointment_date,

                    booking.appointment_time,

                    client.timezone

                );


            DateTimeHelper.ensureValid(

                requestedStart,

                "Requested appointment start"

            );


            const requestedEnd =

                requestedStart.plus({

                    minutes:

                        booking.service_duration_minutes +

                        businessSettings.buffer_minutes

                });


            const googleAvailability =

                await GoogleCalendarService.checkAvailability({

                    clientId:
                        booking.client_id,

                    startDateTime:
                        requestedStart.toUTC().toISO()!,

                    endDateTime:
                        requestedEnd.toUTC().toISO()!,

                    /*
                     * During rescheduling, exclude the event that
                     * belongs to the appointment being moved.
                     *
                     * We use the booking ID here only for our own
                     * database exclusion. The actual Google event
                     * exclusion is supplied by the caller when the
                     * booking object contains its Calendar event ID.
                     */
                    excludeEventId:
                        booking.google_calendar_event_id ??
                        undefined

                });


            if (

                !googleAvailability.available

            ) {

                return {

                    available:
                        false,

                    reason:
                        AvailabilityReason.SLOT_OCCUPIED,

                    suggestedSlots:
                        []

                };

            }

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

            available:
                true,

            reason:
                AvailabilityReason.AVAILABLE,

            suggestedSlots

        };

    }

}