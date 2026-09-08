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

    private static readonly DEFAULT_CALENDAR_ID =
        "primary";

    private static readonly MAX_RETRIES =
        3;

    private static readonly RETRY_DELAY =
        1000;


    /*
    |--------------------------------------------------------------------------
    | Calendar Cache
    |--------------------------------------------------------------------------
    */

    private static readonly calendarCache =
        new Map<
            string,
            calendar_v3.Calendar
        >();


    /*
    |--------------------------------------------------------------------------
    | OAuth Client
    |--------------------------------------------------------------------------
    */

    private static async getOAuthClient(
        clientId: string
    ) {

        if (!clientId?.trim()) {

            throw new Error(
                "Client ID is required."
            );

        }

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

        const normalizedClientId =
            clientId.trim();


        const cached =
            this.calendarCache.get(
                normalizedClientId
            );


        if (cached) {

            return cached;

        }


        const auth =
            await this.getOAuthClient(
                normalizedClientId
            );


        const calendar =
            google.calendar({

                version: "v3",

                auth

            });


        this.calendarCache.set(

            normalizedClientId,

            calendar

        );


        return calendar;

    }


    /*
    |--------------------------------------------------------------------------
    | Retry Wrapper
    |--------------------------------------------------------------------------
    |
    | Retry only transient Google API failures.
    |
    | Authentication, permission, validation and not-found errors
    | should NOT be blindly retried.
    |--------------------------------------------------------------------------
    */

    private static async executeWithRetry<T>(
        operation: () => Promise<T>
    ): Promise<T> {

        let lastError: unknown;


        for (

            let attempt = 1;

            attempt <=
            this.MAX_RETRIES;

            attempt++

        ) {

            try {

                return await operation();

            }

            catch (error: unknown) {

                lastError =
                    error;


                const status =
                    this.getStatusCode(
                        error
                    );


                const retryable =
                    this.isRetryableStatus(
                        status
                    );


                if (

                    !retryable ||

                    attempt ===
                    this.MAX_RETRIES

                ) {

                    break;

                }


                await new Promise<void>(
                    resolve =>

                        setTimeout(

                            resolve,

                            attempt *
                            this.RETRY_DELAY

                        )

                );

            }

        }


        throw lastError;

    }


    /*
    |--------------------------------------------------------------------------
    | Status Code
    |--------------------------------------------------------------------------
    */

    private static getStatusCode(
        error: unknown
    ): number | undefined {

        if (
            !error ||
            typeof error !== "object"
        ) {

            return undefined;

        }


        const value =
            error as {

                code?: unknown;

                response?: {

                    status?: unknown;

                };

            };


        const responseStatus =
            Number(
                value.response?.status
            );


        if (
            Number.isFinite(
                responseStatus
            ) &&
            responseStatus > 0
        ) {

            return responseStatus;

        }


        const code =
            Number(
                value.code
            );


        if (
            Number.isFinite(
                code
            ) &&
            code > 0
        ) {

            return code;

        }


        return undefined;

    }


    /*
    |--------------------------------------------------------------------------
    | Retryable Status
    |--------------------------------------------------------------------------
    */

    private static isRetryableStatus(
        status: number | undefined
    ): boolean {

        return (

            status === 429 ||

            status === 500 ||

            status === 502 ||

            status === 503 ||

            status === 504

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Error Handler
    |--------------------------------------------------------------------------
    */

    private static handleError(
        operation: string,
        error: unknown,
        clientId?: string
    ): never {

        const status =
            this.getStatusCode(
                error
            );


        /*
        |--------------------------------------------------------------------------
        | Clear Cached Client On Authorization Failure
        |--------------------------------------------------------------------------
        */

        if (

            clientId &&

            (
                status === 401 ||
                status === 403
            )

        ) {

            this.clearCache(
                clientId
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Never Log Raw Google Error Objects
        |--------------------------------------------------------------------------
        |
        | Google error objects can contain request metadata and other
        | information that we do not want dumped into production logs.
        |--------------------------------------------------------------------------
        */

        console.error(
            `[Google Calendar] ${operation} failed.`,
            {
                status
            }
        );


        /*
        |--------------------------------------------------------------------------
        | Authentication / Permission
        |--------------------------------------------------------------------------
        */

        if (
            status === 401
        ) {

            throw new Error(
                "Google authorization has expired or been revoked. Please reconnect the Google account."
            );

        }


        if (
            status === 403
        ) {

            throw new Error(
                "Google Calendar access was denied. Please reconnect the Google account and approve the required permissions."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Not Found
        |--------------------------------------------------------------------------
        */

        if (
            status === 404
        ) {

            throw new Error(
                `Google Calendar ${operation} failed because the requested event or calendar was not found.`
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Rate Limit
        |--------------------------------------------------------------------------
        */

        if (
            status === 429
        ) {

            throw new Error(
                "Google Calendar rate limit reached. Please try again shortly."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Generic Error
        |--------------------------------------------------------------------------
        */

        if (
            error instanceof Error &&
            error.message
        ) {

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

            const clientId =
                request.booking.client_id;


            const calendar =
                await this.getCalendar(
                    clientId
                );


            const event =
                EventBuilder.build(
                    request
                );


            /*
            |--------------------------------------------------------------------------
            | Create Event
            |--------------------------------------------------------------------------
            */

            const response =
                await this.executeWithRetry(
                    () =>
                        calendar.events.insert({

                            calendarId:
                                this.DEFAULT_CALENDAR_ID,

                            requestBody:
                                event,

                            sendUpdates:
                                "all"

                        })
                );


            if (
                !response.data.id
            ) {

                throw new Error(
                    "Google Calendar did not return an event ID."
                );

            }


            return {

                eventId:
                    response.data.id,

                htmlLink:
                    response.data.htmlLink ??
                    undefined

            };

        }

        catch (error: unknown) {

            this.handleError(
                "create event",
                error,
                request.booking.client_id
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

        const clientId =
            request.clientId;


        try {

            if (
                !request.eventId?.trim()
            ) {

                throw new Error(
                    "Google Calendar Event ID is missing."
                );

            }


            const calendar =
                await this.getCalendar(
                    clientId
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


            await this.executeWithRetry(
                () =>
                    calendar.events.update({

                        calendarId:
                            this.DEFAULT_CALENDAR_ID,

                        eventId:
                            request.eventId,

                        requestBody:
                            event,

                        sendUpdates:
                            "all"

                    })
            );

        }

        catch (error: unknown) {

            this.handleError(
                "update event",
                error,
                clientId
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

        if (
            !eventId?.trim()
        ) {

            return;

        }


        try {

            const calendar =
                await this.getCalendar(
                    clientId
                );


            await this.executeWithRetry(
                () =>
                    calendar.events.delete({

                        calendarId:
                            this.DEFAULT_CALENDAR_ID,

                        eventId:
                            eventId.trim(),

                        sendUpdates:
                            "all"

                    })
            );

        }

        catch (error: unknown) {

            const status =
                this.getStatusCode(
                    error
                );


            /*
            |--------------------------------------------------------------------------
            | Idempotent Cancellation
            |--------------------------------------------------------------------------
            |
            | If the event has already been deleted from Google Calendar,
            | the desired final state has already been achieved.
            |--------------------------------------------------------------------------
            */

            if (
                status === 404
            ) {

                return;

            }


            this.handleError(
                "delete event",
                error,
                clientId
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

        const clientId =
            request.clientId;


        try {

            const calendar =
                await this.getCalendar(
                    clientId
                );


            const response =
                await this.executeWithRetry(
                    () =>
                        calendar.events.list({

                            calendarId:
                                this.DEFAULT_CALENDAR_ID,

                            timeMin:
                                request.startDateTime,

                            timeMax:
                                request.endDateTime,

                            singleEvents:
                                true,

                            orderBy:
                                "startTime",

                            showDeleted:
                                false

                        })
                );


            const events =
                response.data.items ??
                [];


            /*
            |--------------------------------------------------------------------------
            | Ignore Cancelled Events
            |--------------------------------------------------------------------------
            */

            const activeEvents =
                events.filter(
                    event =>
                        event.status !==
                        "cancelled"
                );


            /*
            |--------------------------------------------------------------------------
            | Exclude Current Event
            |--------------------------------------------------------------------------
            |
            | Required during rescheduling.
            |--------------------------------------------------------------------------
            */

            const conflicts =
                request.excludeEventId

                    ? activeEvents.filter(

                        event =>
                            event.id !==
                            request.excludeEventId

                    )

                    : activeEvents;


            return {

                available:
                    conflicts.length ===
                    0,

                conflicts

            };

        }

        catch (error: unknown) {

            this.handleError(
                "check availability",
                error,
                clientId
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

            if (
                !eventId?.trim()
            ) {

                throw new Error(
                    "Google Calendar Event ID is missing."
                );

            }


            const calendar =
                await this.getCalendar(
                    clientId
                );


            const response =
                await this.executeWithRetry(
                    () =>
                        calendar.events.get({

                            calendarId:
                                this.DEFAULT_CALENDAR_ID,

                            eventId:
                                eventId.trim()

                        })
                );


            return response.data;

        }

        catch (error: unknown) {

            this.handleError(
                "get event",
                error,
                clientId
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
    ): Promise<
        calendar_v3.Schema$Event[]
    > {

        try {

            if (
                !timeMin?.trim()
            ) {

                throw new Error(
                    "timeMin is required."
                );

            }


            if (
                !timeMax?.trim()
            ) {

                throw new Error(
                    "timeMax is required."
                );

            }


            const start =
                new Date(
                    timeMin
                );


            const end =
                new Date(
                    timeMax
                );


            if (
                Number.isNaN(
                    start.getTime()
                )
            ) {

                throw new Error(
                    "timeMin must be a valid date/time."
                );

            }


            if (
                Number.isNaN(
                    end.getTime()
                )
            ) {

                throw new Error(
                    "timeMax must be a valid date/time."
                );

            }


            if (
                end.getTime() <=
                start.getTime()
            ) {

                throw new Error(
                    "timeMax must be after timeMin."
                );

            }


            const calendar =
                await this.getCalendar(
                    clientId
                );


            const response =
                await this.executeWithRetry(
                    () =>
                        calendar.events.list({

                            calendarId:
                                this.DEFAULT_CALENDAR_ID,

                            timeMin:
                                start.toISOString(),

                            timeMax:
                                end.toISOString(),

                            singleEvents:
                                true,

                            orderBy:
                                "startTime",

                            showDeleted:
                                false

                        })
                );


            return (
                response.data.items ??
                []
            );

        }

        catch (error: unknown) {

            this.handleError(
                "list events",
                error,
                clientId
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

        if (
            clientId?.trim()
        ) {

            this.calendarCache.delete(
                clientId.trim()
            );

            return;

        }


        this.calendarCache.clear();

    }

}