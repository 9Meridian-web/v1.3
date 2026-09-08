import { Booking } from "../../types/booking";
import { BusinessSettings } from "../../types/businessSettings";

import { DateTimeHelper } from "../../helpers/dateTimeHelper";

export interface SuggestionServiceRequest {

    booking: Booking;

    businessSettings: BusinessSettings;

    existingBookings: Booking[];

    timezone?: string;

    numberOfSuggestions?: number;

}

export class SuggestionService {

    /*
    |--------------------------------------------------------------------------
    | Generate Suggestions
    |--------------------------------------------------------------------------
    */

    static async generate(

        request: SuggestionServiceRequest

    ): Promise<string[]> {

        const {

            booking,

            businessSettings,

            existingBookings,

            timezone,

            numberOfSuggestions = 3

        } = request;

        const suggestions: string[] = [];

        const appointmentDuration =

            businessSettings.appointment_duration;

        const slotInterval =

            appointmentDuration +

            businessSettings.buffer_minutes;

        const closingTime =

            DateTimeHelper.create(

                booking.appointment_date,

                businessSettings.closing_time,

                timezone

            );

        let currentSlot =

            DateTimeHelper.create(

                booking.appointment_date,

                booking.appointment_time,

                timezone

            ).plus({

                minutes: slotInterval

            });

        while (

            suggestions.length < numberOfSuggestions

        ) {

            const currentSlotEnd =

                currentSlot.plus({

                    minutes: appointmentDuration

                });

            /*
            |--------------------------------------------------------------------------
            | Stop After Closing Time
            |--------------------------------------------------------------------------
            */

            if (

                currentSlotEnd > closingTime

            ) {

                break;

            }

            /*
            |--------------------------------------------------------------------------
            | Check Conflicts
            |--------------------------------------------------------------------------
            */

            const hasConflict =

                existingBookings.some(

                    (existingBooking) => {

                        if (

                            booking.id &&

                            booking.id === existingBooking.id

                        ) {

                            return false;

                        }

                        if (

                            existingBooking.status ===

                            "cancelled"

                        ) {

                            return false;

                        }

                        const existingStart =

                            DateTimeHelper.create(

                                existingBooking.appointment_date,

                                existingBooking.appointment_time,

                                timezone

                            );

                        const existingEnd =

                            existingStart.plus({

                                minutes:

                                    appointmentDuration +

                                    businessSettings.buffer_minutes

                            });

                        return (

                            currentSlot < existingEnd &&

                            currentSlotEnd > existingStart

                        );

                    }

                );

            /*
            |--------------------------------------------------------------------------
            | Save Available Slot
            |--------------------------------------------------------------------------
            */

            if (

                !hasConflict

            ) {

                suggestions.push(

                    currentSlot.toFormat(

                        "hh:mm a"

                    )

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Next Slot
            |--------------------------------------------------------------------------
            */

            currentSlot =

                currentSlot.plus({

                    minutes: slotInterval

                });

        }

        return suggestions;

    }

}