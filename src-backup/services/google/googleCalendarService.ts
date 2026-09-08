import { google, calendar_v3 } from "googleapis";

import { TokenManager } from "./tokenManager";

import {
    CalendarEventRequest,
    CalendarUpdateRequest,
    CalendarEventResponse,
    AvailabilityRequest,
    AvailabilityResponse
} from "./types/calendarTypes";

import { EventBuilder } from "./builders/eventBuilder";

export class GoogleCalendarService {

    /*
    |--------------------------------------------------------------------------
    | Configuration
    |--------------------------------------------------------------------------
    */

    private static readonly DEFAULT_CALENDAR_ID = "primary";

    private static readonly MAX_RETRIES = 3;

    private static readonly RETRY_DELAY = 1000;

    /*
    |--------------------------------------------------------------------------
    | Calendar Cache
    |--------------------------------------------------------------------------
    */

    private static readonly calendarCache =
        new Map<string, calendar_v3.Calendar>();

    /*
    |--------------------------------------------------------------------------
    | OAuth Client
    |--------------------------------------------------------------------------
    */

    private static async getOAuthClient(
        clientId: string
    ) {

        return TokenManager.getOAuthClient(
            clientId
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Calendar Client
    |--------------------------------------------------------------------------
    */

    private static async getCalendar(
        clientId: string
    ): Promise<calendar_v3.Calendar> {

        const cached =
            this.calendarCache.get(clientId);

        if (cached) {

            return cached;

        }

        const auth =
            await this.getOAuthClient(
                clientId
            );

        const calendar =
            google.calendar({

                version: "v3",

                auth

            });

        this.calendarCache.set(

            clientId,

            calendar

        );

        return calendar;

    }

    /*
    |--------------------------------------------------------------------------
    | Retry Wrapper
    |--------------------------------------------------------------------------
    */

    private static async executeWithRetry<T>(
        operation: () => Promise<T>
    ): Promise<T> {

        let lastError: unknown;

        for (

            let attempt = 1;

            attempt <= this.MAX_RETRIES;

            attempt++

        ) {

            try {

                return await operation();

            }

            catch (error: any) {

                lastError = error;

                const status =
                    error?.code ??
                    error?.response?.status;

                const retryable =

                    status === 429 ||
                    status === 500 ||
                    status === 502 ||
                    status === 503 ||
                    status === 504;

                if (

                    !retryable ||

                    attempt === this.MAX_RETRIES

                ) {

                    break;

                }

                await new Promise(resolve =>
                    setTimeout(
                        resolve,
                        attempt * this.RETRY_DELAY
                    )
                );

            }

        }

        throw lastError;

    }

    /*
    |--------------------------------------------------------------------------
    | Error Handler
    |--------------------------------------------------------------------------
    */

    private static handleError(
        operation: string,
        error: unknown
    ): never {

        console.error(

            `\n========== GOOGLE CALENDAR ERROR ==========`,

            `\nOperation : ${operation}`,

            `\nTimestamp : ${new Date().toISOString()}`,

            "\nError :",

            error,

            "\n===========================================\n"

        );

        if (error instanceof Error) {

            throw new Error(

                `Google Calendar ${operation} failed: ${error.message}`

            );

        }

        throw new Error(

            `Google Calendar ${operation} failed.`

        );

    }
    /*
    |--------------------------------------------------------------------------
    | Create Event
    |--------------------------------------------------------------------------
    */

    static async createEvent(
        request: CalendarEventRequest
    ): Promise<CalendarEventResponse> {

        try {

            const calendar =
                await this.getCalendar(
                    request.booking.client_id
                );

            const event =
                EventBuilder.build(
                    request
                );
                console.log("========== GOOGLE EVENT ==========");
console.log(JSON.stringify(event, null, 2));
console.log("==================================");

            const response =
                await this.executeWithRetry(() =>
                    calendar.events.insert({

                        calendarId:
                            this.DEFAULT_CALENDAR_ID,

                        requestBody:
                            event,

                        sendUpdates: "all"

                    })
                );

            return {

                eventId:
                    response.data.id!,

                htmlLink:
                    response.data.htmlLink ??
                    undefined

            };

        }

        catch (error) {

            this.handleError(
                "create event",
                error
            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Update Event
    |--------------------------------------------------------------------------
    */

    static async updateEvent(
        request: CalendarUpdateRequest
    ): Promise<void> {

        try {

            if (!request.eventId) {

                throw new Error(
                    "Google Calendar Event ID is missing."
                );

            }

            const calendar =
                await this.getCalendar(
                    request.clientId
                );

            const event =
                EventBuilder.build({

                    booking:
                        request.booking,

                    client:
                        request.client,

                    businessSettings:
                        request.businessSettings

                });

            await this.executeWithRetry(() =>
                calendar.events.update({

                    calendarId:
                        this.DEFAULT_CALENDAR_ID,

                    eventId:
                        request.eventId,

                    requestBody:
                        event,

                    sendUpdates: "all"

                })
            );

        }

        catch (error) {

            this.handleError(
                "update event",
                error
            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Delete Event
    |--------------------------------------------------------------------------
    */

    static async deleteEvent(
        clientId: string,
        eventId: string
    ): Promise<void> {

        try {

            if (!eventId) {

                return;

            }

            const calendar =
                await this.getCalendar(
                    clientId
                );

            await this.executeWithRetry(() =>
                calendar.events.delete({

                    calendarId:
                        this.DEFAULT_CALENDAR_ID,

                    eventId,

                    sendUpdates: "all"

                })
            );

        }

        catch (error) {

            this.handleError(
                "delete event",
                error
            );

        }

    }
        /*
    |--------------------------------------------------------------------------
    | Check Availability
    |--------------------------------------------------------------------------
    */

    static async checkAvailability(
        request: AvailabilityRequest
    ): Promise<AvailabilityResponse> {

        try {

            const calendar =
                await this.getCalendar(
                    request.clientId
                );

            const response =
                await this.executeWithRetry(() =>
                    calendar.events.list({

                        calendarId:
                            this.DEFAULT_CALENDAR_ID,

                        timeMin:
                            request.startDateTime,

                        timeMax:
                            request.endDateTime,

                        singleEvents: true,

                        orderBy: "startTime"

                    })
                );

            const events =
                response.data.items ?? [];

            const conflicts =
                request.excludeEventId

                    ? events.filter(
                        event =>
                            event.id !==
                            request.excludeEventId
                    )

                    : events;

            return {

                available:
                    conflicts.length === 0,

                conflicts

            };

        }

        catch (error) {

            this.handleError(
                "check availability",
                error
            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Get Event
    |--------------------------------------------------------------------------
    */

    static async getEvent(
        clientId: string,
        eventId: string
    ): Promise<calendar_v3.Schema$Event> {

        try {

            const calendar =
                await this.getCalendar(
                    clientId
                );

            const response =
                await this.executeWithRetry(() =>
                    calendar.events.get({

                        calendarId:
                            this.DEFAULT_CALENDAR_ID,

                        eventId

                    })
                );

            return response.data;

        }

        catch (error) {

            this.handleError(
                "get event",
                error
            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | List Events
    |--------------------------------------------------------------------------
    */

    static async listEvents(
        clientId: string,
        timeMin: string,
        timeMax: string
    ): Promise<calendar_v3.Schema$Event[]> {

        try {

            const calendar =
                await this.getCalendar(
                    clientId
                );

            const response =
                await this.executeWithRetry(() =>
                    calendar.events.list({

                        calendarId:
                            this.DEFAULT_CALENDAR_ID,

                        timeMin,

                        timeMax,

                        singleEvents: true,

                        orderBy: "startTime"

                    })
                );

            return response.data.items ?? [];

        }

        catch (error) {

            this.handleError(
                "list events",
                error
            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Clear Cache
    |--------------------------------------------------------------------------
    */

    static clearCache(
        clientId?: string
    ): void {

        if (clientId) {

            this.calendarCache.delete(
                clientId
            );

            return;

        }

        this.calendarCache.clear();

    }

}