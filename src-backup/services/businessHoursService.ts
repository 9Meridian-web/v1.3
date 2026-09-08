import { DateTime } from "luxon";

export interface BusinessHours {

    timezone: string;

    openingTime: string;

    closingTime: string;

    workingDays: number[];

    appointmentDuration: number;

}

export interface BusinessHoursResult {

    success: boolean;

    message?: string;

}

export class BusinessHoursService {

    /*
    |--------------------------------------------------------------------------
    | Default Clinic Settings
    |--------------------------------------------------------------------------
    */

    private static readonly DEFAULT_SETTINGS: BusinessHours = {

        timezone: "Asia/Kolkata",

        openingTime: "09:00",

        closingTime: "18:00",

        workingDays: [

            1,

            2,

            3,

            4,

            5,

            6

        ],

        appointmentDuration: 30

    };

    /*
    |--------------------------------------------------------------------------
    | Validate Appointment
    |--------------------------------------------------------------------------
    */

    static validate(

        appointmentISO: string,

        settings: BusinessHours =

            this.DEFAULT_SETTINGS

    ): BusinessHoursResult {

        const appointment = DateTime

            .fromISO(

                appointmentISO,

                {

                    zone: settings.timezone

                }

            );

        if (

            !appointment.isValid

        ) {

            return {

                success: false,

                message:

                    "Invalid appointment date."

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Past Date
        |--------------------------------------------------------------------------
        */

        if (

            appointment < DateTime.now()

        ) {

            return {

                success: false,

                message:

                    "Appointment cannot be in the past."

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Working Day
        |--------------------------------------------------------------------------
        */

        if (

            !settings.workingDays.includes(

                appointment.weekday

            )

        ) {

            return {

                success: false,

                message:

                    "Clinic is closed on that day."

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Opening Hours
        |--------------------------------------------------------------------------
        */

        const [

            openHour,

            openMinute

        ] = settings

            .openingTime

            .split(":")

            .map(Number);

        const [

            closeHour,

            closeMinute

        ] = settings

            .closingTime

            .split(":")

            .map(Number);

        const opening = appointment.set({

            hour: openHour,

            minute: openMinute,

            second: 0,

            millisecond: 0

        });

        const closing = appointment.set({

            hour: closeHour,

            minute: closeMinute,

            second: 0,

            millisecond: 0

        });

        if (

            appointment < opening ||

            appointment >= closing

        ) {

            return {

                success: false,

                message:

                    `Clinic operates between ${settings.openingTime} and ${settings.closingTime}.`

            };

        }

        return {

            success: true

        };

    }

}