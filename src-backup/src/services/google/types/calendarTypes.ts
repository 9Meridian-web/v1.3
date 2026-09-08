import { calendar_v3 } from "googleapis";

import { Booking } from "../../../types/booking";
import { Client } from "../../../types/client";
import { BusinessSettings } from "../../../types/businessSettings";

/*
|--------------------------------------------------------------------------
| Create Event
|--------------------------------------------------------------------------
*/

export interface CalendarEventRequest {

    booking: Booking;

    client: Client;

    businessSettings: BusinessSettings;

}

export interface CalendarEventResponse {

    eventId: string;

    htmlLink?: string;

}

/*
|--------------------------------------------------------------------------
| Update Event
|--------------------------------------------------------------------------
*/

export interface CalendarUpdateRequest {

    clientId: string;

    eventId: string;

    booking: Booking;

    client: Client;

    businessSettings: BusinessSettings;

}

/*
|--------------------------------------------------------------------------
| Availability
|--------------------------------------------------------------------------
*/

export interface AvailabilityRequest {

    clientId: string;

    startDateTime: string;

    endDateTime: string;

    excludeEventId?: string;

}

export interface AvailabilityResponse {

    available: boolean;

    conflicts: calendar_v3.Schema$Event[];

}