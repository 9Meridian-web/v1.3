import { google } from "googleapis";
import { env } from "../config/env";

export class GoogleCalendarHelper {

    /*
    |--------------------------------------------------------------------------
    | OAuth Client
    |--------------------------------------------------------------------------
    */

    private static createClient(refreshToken: string) {

        const auth = new google.auth.OAuth2(

            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            env.GOOGLE_REDIRECT_URI

        );

        auth.setCredentials({

            refresh_token: refreshToken

        });

        return auth;

    }

    /*
    |--------------------------------------------------------------------------
    | Calendar API
    |--------------------------------------------------------------------------
    */

    static calendar(refreshToken: string) {

        return google.calendar({

            version: "v3",

            auth: this.createClient(refreshToken)

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Sheets API
    |--------------------------------------------------------------------------
    */

    static sheets(refreshToken: string) {

        return google.sheets({

            version: "v4",

            auth: this.createClient(refreshToken)

        });

    }

    /*
    |--------------------------------------------------------------------------
    | OAuth2 API
    |--------------------------------------------------------------------------
    */

    static oauth(refreshToken: string) {

        return google.oauth2({

            version: "v2",

            auth: this.createClient(refreshToken)

        });

    }
    /*
    |--------------------------------------------------------------------------
    | Google User Email
    |--------------------------------------------------------------------------
    */

    static async getUserEmail(
        refreshToken: string
    ): Promise<string> {

        const oauth = this.oauth(refreshToken);

        const { data } = await oauth.userinfo.get();

        if (!data.email) {

            throw new Error(
                "Unable to retrieve Google email."
            );

        }

        return data.email;

    }
        /*
    |--------------------------------------------------------------------------
    | Primary Calendar
    |--------------------------------------------------------------------------
    */

    static async getPrimaryCalendar(
        refreshToken: string
    ): Promise<string> {

        const calendar = this.calendar(refreshToken);

        const { data } =
            await calendar.calendarList.list();

        const primary =
            data.items?.find(

                item => item.primary

            );

        return primary?.id ?? "primary";

    }
        /*
    |--------------------------------------------------------------------------
    | Create Spreadsheet
    |--------------------------------------------------------------------------
    */

    static async createSpreadsheet(

        refreshToken: string,

        title: string

    ): Promise<{

        spreadsheetId: string;

        spreadsheetName: string;

    }> {

        const sheets =
            this.sheets(refreshToken);

        const { data } =
            await sheets.spreadsheets.create({

                requestBody: {

                    properties: {

                        title

                    }

                }

            });

        if (!data.spreadsheetId) {

            throw new Error(

                "Failed to create spreadsheet."

            );

        }

        return {

            spreadsheetId:
                data.spreadsheetId,

            spreadsheetName:
                data.properties?.title ?? title

        };

    }
        /*
    |--------------------------------------------------------------------------
    | Initialize Booking Sheet
    |--------------------------------------------------------------------------
    */

    static async initializeBookingSheet(

        refreshToken: string,

        spreadsheetId: string

    ): Promise<void> {

        const sheets =
            this.sheets(refreshToken);

        await sheets.spreadsheets.values.update({

            spreadsheetId,

            range: "A1:H1",

            valueInputOption: "RAW",

            requestBody: {

                values: [[

                    "Booking ID",

                    "Patient",

                    "Phone",

                    "Email",

                    "Doctor",

                    "Date",

                    "Time",

                    "Status"

                ]]

            }

        });

    }
/*
|--------------------------------------------------------------------------
| Create Calendar Event
|--------------------------------------------------------------------------
*/

static async createEvent(

    refreshToken: string,

    calendarId: string,

    event: any

) {

    const calendar =
        this.calendar(refreshToken);

    const { data } =
        await calendar.events.insert({

            calendarId,

            requestBody: event,

            sendUpdates: "all"

        });

    return data;

}

/*
|--------------------------------------------------------------------------
| Update Calendar Event
|--------------------------------------------------------------------------
*/

static async updateEvent(

    refreshToken: string,

    calendarId: string,

    eventId: string,

    event: any

) {

    const calendar =
        this.calendar(refreshToken);

    const { data } =
        await calendar.events.update({

            calendarId,

            eventId,

            requestBody: event,

            sendUpdates: "all"

        });

    return data;

}

/*
|--------------------------------------------------------------------------
| Delete Calendar Event
|--------------------------------------------------------------------------
*/

static async deleteEvent(

    refreshToken: string,

    calendarId: string,

    eventId: string

): Promise<void> {

    const calendar =
        this.calendar(refreshToken);

    await calendar.events.delete({

        calendarId,

        eventId,

        sendUpdates: "all"

    });

}
/*
|--------------------------------------------------------------------------
| Get Event
|--------------------------------------------------------------------------
*/

static async getEvent(

    refreshToken: string,

    calendarId: string,

    eventId: string

) {

    const calendar =
        this.calendar(refreshToken);

    const { data } =
        await calendar.events.get({

            calendarId,

            eventId

        });

    return data;

}
/*
|--------------------------------------------------------------------------
| Upcoming Events
|--------------------------------------------------------------------------
*/

static async getUpcomingEvents(

    refreshToken: string,

    calendarId: string,

    maxResults = 20

) {

    const calendar =
        this.calendar(refreshToken);

    const { data } =
        await calendar.events.list({

            calendarId,

            singleEvents: true,

            orderBy: "startTime",

            timeMin: new Date().toISOString(),

            maxResults

        });

    return data.items ?? [];

}
/*
|--------------------------------------------------------------------------
| Check Availability
|--------------------------------------------------------------------------
*/

static async isTimeSlotAvailable(

    refreshToken: string,

    calendarId: string,

    start: Date,

    end: Date

): Promise<boolean> {

    const calendar =
        this.calendar(refreshToken);

    const { data } =
        await calendar.events.list({

            calendarId,

            timeMin: start.toISOString(),

            timeMax: end.toISOString(),

            singleEvents: true

        });

    return (data.items?.length ?? 0) === 0;

}
/*
|--------------------------------------------------------------------------
| Find Free Slots
|--------------------------------------------------------------------------
*/

static async findFreeSlots(

    refreshToken: string,

    calendarId: string,

    date: Date

) {

    const calendar =
        this.calendar(refreshToken);

    const startOfDay = new Date(date);

    startOfDay.setHours(9,0,0,0);

    const endOfDay = new Date(date);

    endOfDay.setHours(18,0,0,0);

    const { data } =
        await calendar.events.list({

            calendarId,

            timeMin: startOfDay.toISOString(),

            timeMax: endOfDay.toISOString(),

            singleEvents: true,

            orderBy: "startTime"

        });

    return data.items ?? [];

}
}