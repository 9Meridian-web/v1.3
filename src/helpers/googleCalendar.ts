import { google, calendar_v3, sheets_v4 } from "googleapis";
import { env } from "../config/env";

type OAuth2Client = InstanceType<
    typeof google.auth.OAuth2
>;

export class GoogleCalendarHelper {

    /*
    |--------------------------------------------------------------------------
    | OAuth Client
    |--------------------------------------------------------------------------
    */

    private static createClient(
        refreshToken: string
    ): OAuth2Client {

        const normalizedToken =
            String(refreshToken ?? "").trim();

        if (!normalizedToken) {
            throw new Error(
                "Google refresh token is required."
            );
        }

        const auth =
            new google.auth.OAuth2(
                env.GOOGLE_CLIENT_ID,
                env.GOOGLE_CLIENT_SECRET,
                env.GOOGLE_REDIRECT_URI
            );

        auth.setCredentials({
            refresh_token:
                normalizedToken
        });

        return auth;
    }


    /*
    |--------------------------------------------------------------------------
    | Calendar API
    |--------------------------------------------------------------------------
    */

    static calendar(
        refreshToken: string
    ) {

        return google.calendar({
            version: "v3",
            auth:
                this.createClient(
                    refreshToken
                )
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Sheets API
    |--------------------------------------------------------------------------
    */

    static sheets(
        refreshToken: string
    ) {

        return google.sheets({
            version: "v4",
            auth:
                this.createClient(
                    refreshToken
                )
        });
    }


    /*
    |--------------------------------------------------------------------------
    | OAuth2 API
    |--------------------------------------------------------------------------
    */

    static oauth(
        refreshToken: string
    ) {

        return google.oauth2({
            version: "v2",
            auth:
                this.createClient(
                    refreshToken
                )
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

        try {

            const oauth =
                this.oauth(
                    refreshToken
                );

            const {
                data
            } = await oauth.userinfo.get();

            if (!data.email) {

                throw new Error(
                    "Unable to retrieve Google email."
                );
            }

            return data.email;

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to retrieve Google account information."
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Primary Calendar
    |--------------------------------------------------------------------------
    */

    static async getPrimaryCalendar(
        refreshToken: string
    ): Promise<string> {

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            const {
                data
            } =
                await calendar.calendarList.list({
                    minAccessRole: "reader"
                });

            const primary =
                data.items?.find(
                    (
                        item
                    ) =>
                        item.primary === true
                );

            /*
             * Google normally exposes the primary
             * calendar as "primary".
             */
            return (
                primary?.id ??
                "primary"
            );

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to access the Google Calendar."
            );
        }
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

        const normalizedTitle =
            String(title ?? "").trim();

        if (!normalizedTitle) {
            throw new Error(
                "Spreadsheet title is required."
            );
        }

        try {

            const sheets =
                this.sheets(
                    refreshToken
                );

            const {
                data
            } =
                await sheets.spreadsheets.create({
                    requestBody: {
                        properties: {
                            title:
                                normalizedTitle
                        }
                    }
                });

            if (!data.spreadsheetId) {

                throw new Error(
                    "Google did not return a spreadsheet ID."
                );
            }

            return {
                spreadsheetId:
                    data.spreadsheetId,

                spreadsheetName:
                    data.properties?.title ??
                    normalizedTitle
            };

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to create the Google Spreadsheet."
            );
        }
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

        const normalizedSpreadsheetId =
            String(
                spreadsheetId ?? ""
            ).trim();

        if (!normalizedSpreadsheetId) {

            throw new Error(
                "Spreadsheet ID is required."
            );
        }

        try {

            const sheets =
                this.sheets(
                    refreshToken
                );

            await sheets.spreadsheets.values.update({
                spreadsheetId:
                    normalizedSpreadsheetId,

                range:
                    "A1:H1",

                valueInputOption:
                    "RAW",

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

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to initialize the booking spreadsheet."
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Create Calendar Event
    |--------------------------------------------------------------------------
    */

    static async createEvent(
        refreshToken: string,
        calendarId: string,
        event: calendar_v3.Schema$Event
    ): Promise<calendar_v3.Schema$Event> {

        if (!calendarId?.trim()) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        if (!event) {
            throw new Error(
                "Calendar event data is required."
            );
        }

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            const {
                data
            } =
                await calendar.events.insert({
                    calendarId,
                    requestBody: event,
                    sendUpdates: "all"
                });

            return data;

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to create the Google Calendar event."
            );
        }
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
        event: calendar_v3.Schema$Event
    ): Promise<calendar_v3.Schema$Event> {

        if (!calendarId?.trim()) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        if (!eventId?.trim()) {
            throw new Error(
                "Calendar event ID is required."
            );
        }

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            const {
                data
            } =
                await calendar.events.update({
                    calendarId,
                    eventId,
                    requestBody: event,
                    sendUpdates: "all"
                });

            return data;

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to update the Google Calendar event."
            );
        }
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

        if (!calendarId?.trim()) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        if (!eventId?.trim()) {
            throw new Error(
                "Calendar event ID is required."
            );
        }

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            await calendar.events.delete({
                calendarId,
                eventId,
                sendUpdates: "all"
            });

        } catch (error) {

            /*
             * Deleting an already deleted event should not
             * crash the receptionist workflow.
             *
             * Google returns 404 in this case.
             */
            if (
                this.getGoogleStatus(
                    error
                ) === 404
            ) {
                return;
            }

            throw this.normalizeGoogleError(
                error,
                "Unable to delete the Google Calendar event."
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Get Calendar Event
    |--------------------------------------------------------------------------
    */

    static async getEvent(
        refreshToken: string,
        calendarId: string,
        eventId: string
    ): Promise<calendar_v3.Schema$Event> {

        if (!calendarId?.trim()) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        if (!eventId?.trim()) {
            throw new Error(
                "Calendar event ID is required."
            );
        }

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            const {
                data
            } =
                await calendar.events.get({
                    calendarId,
                    eventId
                });

            return data;

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to retrieve the Google Calendar event."
            );
        }
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
    ): Promise<
        calendar_v3.Schema$Event[]
    > {

        if (!calendarId?.trim()) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        const safeMaxResults =
            Math.min(
                Math.max(
                    Math.floor(
                        Number(
                            maxResults
                        ) || 20
                    ),
                    1
                ),
                250
            );

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            const {
                data
            } =
                await calendar.events.list({
                    calendarId,

                    singleEvents:
                        true,

                    orderBy:
                        "startTime",

                    timeMin:
                        new Date()
                            .toISOString(),

                    maxResults:
                        safeMaxResults
                });

            return (
                data.items ??
                []
            );

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to retrieve upcoming Google Calendar events."
            );
        }
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

        if (!calendarId?.trim()) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        if (
            !(start instanceof Date) ||
            Number.isNaN(
                start.getTime()
            )
        ) {
            throw new Error(
                "A valid start time is required."
            );
        }

        if (
            !(end instanceof Date) ||
            Number.isNaN(
                end.getTime()
            )
        ) {
            throw new Error(
                "A valid end time is required."
            );
        }

        if (
            end.getTime() <=
            start.getTime()
        ) {
            throw new Error(
                "End time must be after start time."
            );
        }

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            const {
                data
            } =
                await calendar.events.list({
                    calendarId,

                    timeMin:
                        start.toISOString(),

                    timeMax:
                        end.toISOString(),

                    singleEvents:
                        true,

                    showDeleted:
                        false,

                    maxResults:
                        50
                });

            /*
             * Ignore cancelled/deleted events.
             */
            const activeEvents =
                (
                    data.items ??
                    []
                ).filter(
                    (
                        event
                    ) =>
                        event.status !==
                        "cancelled"
                );

            return (
                activeEvents.length ===
                0
            );

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to check Google Calendar availability."
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Find Events For A Day
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | We intentionally do not hard-code 9 AM–6 PM here anymore.
    |
    | This method uses the supplied Date's calendar day and creates
    | a UTC-safe 24-hour search window.
    |
    | The business-hours filtering should happen in the booking/
    | availability service using the client's actual timezone and
    | business_settings.
    |--------------------------------------------------------------------------
    */

    static async findFreeSlots(
        refreshToken: string,
        calendarId: string,
        date: Date
    ): Promise<
        calendar_v3.Schema$Event[]
    > {

        if (!calendarId?.trim()) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        if (
            !(date instanceof Date) ||
            Number.isNaN(
                date.getTime()
            )
        ) {
            throw new Error(
                "A valid date is required."
            );
        }

        /*
         * Search the complete UTC day represented by the supplied
         * Date object.
         *
         * We don't silently apply the server's local timezone.
         */
        const startOfDay =
            new Date(
                Date.UTC(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate(),
                    0,
                    0,
                    0,
                    0
                )
            );

        const endOfDay =
            new Date(
                Date.UTC(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate() + 1,
                    0,
                    0,
                    0,
                    0
                )
            );

        try {

            const calendar =
                this.calendar(
                    refreshToken
                );

            const {
                data
            } =
                await calendar.events.list({
                    calendarId,

                    timeMin:
                        startOfDay.toISOString(),

                    timeMax:
                        endOfDay.toISOString(),

                    singleEvents:
                        true,

                    orderBy:
                        "startTime",

                    showDeleted:
                        false
                });

            return (
                data.items ??
                []
            );

        } catch (error) {

            throw this.normalizeGoogleError(
                error,
                "Unable to retrieve Google Calendar events for the requested date."
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Google HTTP Status
    |--------------------------------------------------------------------------
    */

    private static getGoogleStatus(
        error: unknown
    ): number | undefined {

        const value =
            error as {
                response?: {
                    status?: unknown;
                };

                code?: unknown;
            };

        const responseStatus =
            value?.response?.status;

        if (
            typeof responseStatus ===
            "number"
        ) {
            return responseStatus;
        }

        const code =
            Number(
                value?.code
            );

        return Number.isFinite(
            code
        )
            ? code
            : undefined;
    }


    /*
    |--------------------------------------------------------------------------
    | Normalize Google Errors
    |--------------------------------------------------------------------------
    */

    private static normalizeGoogleError(
        error: unknown,
        fallback: string
    ): Error {

        const status =
            this.getGoogleStatus(
                error
            );

        const value =
            error as {
                message?: unknown;

                response?: {
                    data?: {
                        error?: unknown;

                        error_description?: unknown;
                    };
                };
            };

        const googleError =
            value?.response?.data?.error;

        const description =
            value?.response?.data
                ?.error_description;

        /*
         * Never expose raw tokens or credentials.
         */
        if (
            status === 401 ||
            status === 403
        ) {

            return new Error(
                "Google authorization is no longer valid or does not have the required permission. Please reconnect your Google account."
            );
        }

        if (status === 404) {

            return new Error(
                "The requested Google Calendar or resource could not be found."
            );
        }

        if (status === 429) {

            return new Error(
                "Google API rate limit reached. Please try again shortly."
            );
        }

        if (
            typeof googleError ===
            "string" &&
            googleError
        ) {

            return new Error(
                `${fallback} (${googleError})`
            );
        }

        if (
            typeof description ===
            "string" &&
            description
        ) {

            return new Error(
                `${fallback} (${description})`
            );
        }

        if (
            value?.message &&
            typeof value.message ===
                "string"
        ) {

            return new Error(
                `${fallback}: ${value.message}`
            );
        }

        return new Error(
            fallback
        );
    }
}