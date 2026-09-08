import { DateTime } from "luxon";

import { supabase } from "../../config/supabase";

import { BusinessSettings } from "../../types/businessSettings";

export class OverlapService {

    /*
    |--------------------------------------------------------------------------
    | Check Overlap
    |--------------------------------------------------------------------------
    */

    static async hasOverlap(

        clientId: string,

        appointmentUTC: string,

        settings: BusinessSettings

    ): Promise<boolean> {

        /*
        |--------------------------------------------------------------------------
        | Requested Appointment
        |--------------------------------------------------------------------------
        */

        const requestedStart = DateTime.fromISO(

            appointmentUTC,

            {

                zone: "utc"

            }

        );

        const requestedEnd = requestedStart.plus({

            minutes:

                settings.appointment_duration +

                settings.buffer_minutes

        });

        /*
        |--------------------------------------------------------------------------
        | Existing Appointments
        |--------------------------------------------------------------------------
        */

        const {

            data,

            error

        } = await supabase

            .from("appointments")

            .select(

                "appointment_date"

            )

            .eq(

                "client_id",

                clientId

            )

            .eq(

                "status",

                "scheduled"

            );

        if (error) {

            throw error;

        }

        /*
        |--------------------------------------------------------------------------
        | Compare Slots
        |--------------------------------------------------------------------------
        */

        for (

            const booking of data ?? []

        ) {

            const existingStart = DateTime.fromISO(

                booking.appointment_date,

                {

                    zone: "utc"

                }

            );

            const existingEnd = existingStart.plus({

                minutes:

                    settings.appointment_duration +

                    settings.buffer_minutes

            });

            const overlaps =

                requestedStart < existingEnd &&

                requestedEnd > existingStart;

            if (

                overlaps

            ) {

                return true;

            }

        }

        return false;

    }

}