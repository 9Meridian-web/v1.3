import { google, sheets_v4 } from "googleapis";

import { supabase } from "../../config/supabase";

import {
    Booking,
    BookingStatus
} from "../../types/booking";

import { Client } from "../../types/client";

import { TokenManager } from "./tokenManager";

import { BookingRepository } from "../../repositories/bookingRepository";

import { DateFormatter } from "../../utils/dateFormatter";


/*
|--------------------------------------------------------------------------
| Request Interface
|--------------------------------------------------------------------------
*/

export interface SpreadsheetRequest {

    booking: Booking;

    client: Client;

}


/*
|--------------------------------------------------------------------------
| Google Sheets Service
|--------------------------------------------------------------------------
*/

export class GoogleSheetsService {

    /*
    |--------------------------------------------------------------------------
    | Google Sheets Client
    |--------------------------------------------------------------------------
    */

    private static async getSheets(
        clientId: string
    ): Promise<sheets_v4.Sheets> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        if (!normalizedClientId) {

            throw new Error(
                "Client ID is required."
            );
        }

        /*
         * TokenManager handles:
         *
         * encrypted refresh token
         * access token generation
         * invalid_grant detection
         * expired/revoked Google connections
         */

        const auth =
            await TokenManager.getOAuthClient(
                normalizedClientId
            );

        return google.sheets({

            version: "v4",

            auth

        });

    }


    /*
    |--------------------------------------------------------------------------
    | Safe Logger
    |--------------------------------------------------------------------------
    |
    | Never log:
    | - refresh tokens
    | - access tokens
    | - customer email
    | - customer phone
    | - spreadsheet contents
    |--------------------------------------------------------------------------
    */

    private static log(
        message: string,
        data?: Record<string, unknown>
    ): void {

        console.log(
            `[Google Sheets] ${message}`,
            data ?? ""
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Get Spreadsheet ID
    |--------------------------------------------------------------------------
    */

    static async getSpreadsheetId(
        clientId: string
    ): Promise<string> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        if (!normalizedClientId) {

            throw new Error(
                "Client ID is required."
            );

        }

        /*
         * Use the database connection belonging to THIS client.
         */

        const database =
            supabase as any;

        const {
            data,
            error
        } = await database

            .from(
                "google_connections"
            )

            .select(
                "spreadsheet_id,connected"
            )

            .eq(
                "client_id",
                normalizedClientId
            )

            .maybeSingle();


        if (error) {

            throw new Error(
                `Unable to retrieve Google Spreadsheet connection: ${error.message}`
            );

        }


        if (!data) {

            throw new Error(
                "Google connection not found."
            );

        }


        if (!data.connected) {

            throw new Error(
                "Google account is disconnected."
            );

        }


        if (
            data.spreadsheet_id
        ) {

            return data.spreadsheet_id;

        }


        /*
         * Self-healing fallback.
         *
         * If the Google connection exists but the spreadsheet
         * was never created, create it now.
         */

        return await this.createSpreadsheet(
            normalizedClientId
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Create Spreadsheet
    |--------------------------------------------------------------------------
    */

    private static async createSpreadsheet(
        clientId: string
    ): Promise<string> {

        const sheets =
            await this.getSheets(
                clientId
            );


        const spreadsheet =
            await sheets.spreadsheets.create({

                requestBody: {

                    properties: {

                        title:
                            "AI Receptionist Bookings"

                    }

                }

            });


        const spreadsheetId =
            spreadsheet.data
                .spreadsheetId;


        if (!spreadsheetId) {

            throw new Error(
                "Google did not return a spreadsheet ID."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Initialize Header Row
        |--------------------------------------------------------------------------
        */

        await sheets.spreadsheets.values.update({

            spreadsheetId,

            range:
                "Sheet1!A1:K1",

            valueInputOption:
                "RAW",

            requestBody: {

                values: [

                    this.buildHeaders()

                ]

            }

        });


        /*
        |--------------------------------------------------------------------------
        | Save Spreadsheet Against Client
        |--------------------------------------------------------------------------
        */

        const {
            error
        } = await (
            supabase as any
        )

            .from(
                "google_connections"
            )

            .update({

                spreadsheet_id:
                    spreadsheetId,

                spreadsheet_name:
                    "AI Receptionist Bookings",

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "client_id",
                clientId
            );


        if (error) {

            throw new Error(
                `Spreadsheet was created but could not be saved to the client connection: ${error.message}`
            );

        }


        this.log(
            "Spreadsheet created.",
            {
                clientId,
                spreadsheetId
            }
        );


        return spreadsheetId;

    }


    /*
    |--------------------------------------------------------------------------
    | Header Row
    |--------------------------------------------------------------------------
    */

    private static buildHeaders(): string[] {

        return [

            "Booking ID",

            "Customer Name",

            "Phone",

            "Email",

            "Appointment Date",

            "Appointment Time",

            "Service",

            "Reason",

            "Status",

            "Google Event ID",

            "Created At"

        ];

    }


    /*
    |--------------------------------------------------------------------------
    | Booking Row
    |--------------------------------------------------------------------------
    */

    private static buildRow(

        booking: Booking,

        client: Client

    ): string[] {

        return [

            booking.id ?? "",

            booking.customer_name ?? "",

            booking.customer_phone ?? "",

            booking.customer_email ?? "",

            DateFormatter.format(

                booking.appointment_date,

                client

            ),

            booking.appointment_time ?? "",

            booking.service ?? "",

            booking.reason ?? "",

            booking.status ?? "",

            booking.google_calendar_event_id ?? "",

            DateFormatter.format(

                booking.created_at ??
                    new Date()
                        .toISOString(),

                client

            )

        ];

    }


    /*
    |--------------------------------------------------------------------------
    | Append Booking
    |--------------------------------------------------------------------------
    */

    static async appendBooking(
        request: SpreadsheetRequest
    ): Promise<void> {

        const {
            booking,
            client
        } = request;


        if (!booking.id) {

            throw new Error(
                "Booking ID is required before writing to Google Sheets."
            );

        }


        try {

            /*
            |--------------------------------------------------------------------------
            | Prevent Duplicate Sheet Rows
            |--------------------------------------------------------------------------
            */

            let sheetRow =
                booking.sheet_row ??
                null;


            if (!sheetRow) {

                sheetRow =
                    await this.findSheetRow(

                        booking.client_id,

                        booking.id

                    );

            }


            /*
             * If a row already exists, update it instead of
             * creating a duplicate.
             */

            if (sheetRow) {

                booking.sheet_row =
                    sheetRow;

                await this.updateBooking({

                    booking,

                    client

                });

                return;

            }


            /*
            |--------------------------------------------------------------------------
            | Spreadsheet
            |--------------------------------------------------------------------------
            */

            const spreadsheetId =
                await this.getSpreadsheetId(

                    booking.client_id

                );


            /*
            |--------------------------------------------------------------------------
            | Google Sheets API
            |--------------------------------------------------------------------------
            */

            const sheets =
                await this.getSheets(

                    booking.client_id

                );


            const row =
                this.buildRow(

                    booking,

                    client

                );


            const response =
                await sheets

                    .spreadsheets

                    .values

                    .append({

                        spreadsheetId,

                        range:
                            "Sheet1!A:K",

                        valueInputOption:
                            "RAW",

                        insertDataOption:
                            "INSERT_ROWS",

                        requestBody: {

                            values: [

                                row

                            ]

                        }

                    });


            /*
            |--------------------------------------------------------------------------
            | Determine Inserted Row
            |--------------------------------------------------------------------------
            */

            const updatedRange =
                response.data

                    .updates

                    ?.updatedRange;


            if (!updatedRange) {

                throw new Error(
                    "Google Sheets did not return the inserted row."
                );

            }


            const match =
                updatedRange.match(

                    /![A-Z]+(\d+):/

                );


            if (!match) {

                throw new Error(
                    "Unable to determine the inserted Google Sheets row."
                );

            }


            const insertedRow =
                Number(
                    match[1]
                );


            if (
                !Number.isInteger(
                    insertedRow
                ) ||
                insertedRow < 2
            ) {

                throw new Error(
                    "Google Sheets returned an invalid booking row."
                );

            }


            /*
            |--------------------------------------------------------------------------
            | Save Sheet Row In Supabase
            |--------------------------------------------------------------------------
            */

            await BookingRepository.updateSheetRow(

                booking.id,

                insertedRow

            );


            booking.sheet_row =
                insertedRow;


            this.log(
                "Booking appended.",
                {
                    clientId:
                        booking.client_id,

                    bookingId:
                        booking.id,

                    sheetRow:
                        insertedRow
                }
            );

        }

        catch (error) {

            throw this.normalizeGoogleError(

                error,

                "Unable to add the booking to Google Sheets."

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Update Booking
    |--------------------------------------------------------------------------
    */

    static async updateBooking(

        request: SpreadsheetRequest

    ): Promise<void> {

        const {
            booking,
            client
        } = request;


        if (!booking.id) {

            throw new Error(
                "Booking ID is required."
            );

        }


        try {

            /*
            |--------------------------------------------------------------------------
            | Recover Missing Sheet Row
            |--------------------------------------------------------------------------
            */

            let sheetRow =
                booking.sheet_row ??
                null;


            if (!sheetRow) {

                sheetRow =
                    await this.findSheetRow(

                        booking.client_id,

                        booking.id

                    );

            }


            if (!sheetRow) {

                /*
                 * The row does not exist.
                 *
                 * Create it rather than silently losing synchronization.
                 */

                await this.appendBooking({

                    booking,

                    client

                });

                return;

            }


            booking.sheet_row =
                sheetRow;


            /*
            |--------------------------------------------------------------------------
            | Spreadsheet
            |--------------------------------------------------------------------------
            */

            const spreadsheetId =
                await this.getSpreadsheetId(

                    booking.client_id

                );


            const sheets =
                await this.getSheets(

                    booking.client_id

                );


            const row =
                this.buildRow(

                    booking,

                    client

                );


            await sheets

                .spreadsheets

                .values

                .update({

                    spreadsheetId,

                    range:
                        `Sheet1!A${sheetRow}:K${sheetRow}`,

                    valueInputOption:
                        "RAW",

                    requestBody: {

                        values: [

                            row

                        ]

                    }

                });


            /*
            |--------------------------------------------------------------------------
            | Ensure Database Knows The Row
            |--------------------------------------------------------------------------
            */

            await BookingRepository.updateSheetRow(

                booking.id,

                sheetRow

            );


            this.log(
                "Booking sheet row updated.",
                {
                    clientId:
                        booking.client_id,

                    bookingId:
                        booking.id,

                    sheetRow
                }
            );

        }

        catch (error) {

            throw this.normalizeGoogleError(

                error,

                "Unable to update the booking in Google Sheets."

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Find Sheet Row
    |--------------------------------------------------------------------------
    */

    static async findSheetRow(

        clientId: string,

        bookingId: string

    ): Promise<number | null> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        const normalizedBookingId =
            String(bookingId ?? "").trim();


        if (!normalizedClientId) {

            throw new Error(
                "Client ID is required."
            );

        }


        if (!normalizedBookingId) {

            throw new Error(
                "Booking ID is required."
            );

        }


        try {

            const spreadsheetId =
                await this.getSpreadsheetId(

                    normalizedClientId

                );


            const sheets =
                await this.getSheets(

                    normalizedClientId

                );


            const response =
                await sheets

                    .spreadsheets

                    .values

                    .get({

                        spreadsheetId,

                        range:
                            "Sheet1!A:A"

                    });


            const rows =
                response.data.values ??
                [];


            /*
            * Row 1 is the header.
            * Actual bookings begin at row 2.
            */

            for (

                let index = 1;

                index < rows.length;

                index++

            ) {

                const value =
                    String(
                        rows[index]?.[0] ??
                        ""
                    ).trim();


                if (
                    value ===
                    normalizedBookingId
                ) {

                    return (
                        index + 1
                    );

                }

            }


            return null;

        }

        catch (error) {

            throw this.normalizeGoogleError(

                error,

                "Unable to find the booking in Google Sheets."

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Update Booking Status
    |--------------------------------------------------------------------------
    */

    static async updateBookingStatus(

        booking: Booking,

        client: Client,

        status: string

    ): Promise<void> {

        if (!status?.trim()) {

            throw new Error(
                "Booking status is required."
            );

        }


        booking.status =
            status as BookingStatus;


        await this.updateBooking({

            booking,

            client

        });


        this.log(
            "Booking status synchronized.",
            {
                clientId:
                    booking.client_id,

                bookingId:
                    booking.id,

                status
            }
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Delete / Cancel Booking
    |--------------------------------------------------------------------------
    |
    | We intentionally DO NOT delete the spreadsheet row.
    |
    | Historical bookings should remain visible to the business.
    |
    | Instead:
    |
    |       status = cancelled
    |
    |--------------------------------------------------------------------------
    */

    static async deleteBooking(

        request: SpreadsheetRequest

    ): Promise<void> {

        const {
            booking,
            client
        } = request;


        try {

            /*
            |--------------------------------------------------------------------------
            | Recover Sheet Row
            |--------------------------------------------------------------------------
            */

            if (
                !booking.sheet_row &&
                booking.id
            ) {

                booking.sheet_row =
                    await this.findSheetRow(

                        booking.client_id,

                        booking.id

                    );

            }


            /*
            |--------------------------------------------------------------------------
            | If no row exists, nothing to update.
            |--------------------------------------------------------------------------
            */

            if (
                !booking.sheet_row
            ) {

                this.log(
                    "Booking has no Google Sheets row to cancel.",
                    {
                        clientId:
                            booking.client_id,

                        bookingId:
                            booking.id
                    }
                );

                return;

            }


            /*
            |--------------------------------------------------------------------------
            | Update Status
            |--------------------------------------------------------------------------
            */

            await this.updateBookingStatus(

                booking,

                client,

                "cancelled"

            );


            this.log(
                "Booking cancelled in Google Sheets.",
                {
                    clientId:
                        booking.client_id,

                    bookingId:
                        booking.id,

                    sheetRow:
                        booking.sheet_row
                }
            );

        }

        catch (error) {

            throw this.normalizeGoogleError(

                error,

                "Unable to cancel the booking in Google Sheets."

            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Synchronize Sheet Row
    |--------------------------------------------------------------------------
    */

    static async syncSheetRow(

        booking: Booking

    ): Promise<void> {

        if (!booking.id) {

            throw new Error(
                "Booking ID is required."
            );

        }


        if (
            booking.sheet_row
        ) {

            return;

        }


        const row =
            await this.findSheetRow(

                booking.client_id,

                booking.id

            );


        if (!row) {

            return;

        }


        booking.sheet_row =
            row;


        await BookingRepository.updateSheetRow(

            booking.id,

            row

        );


        this.log(
            "Booking sheet row synchronized.",
            {
                clientId:
                    booking.client_id,

                bookingId:
                    booking.id,

                sheetRow:
                    row
            }
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Health Check
    |--------------------------------------------------------------------------
    */

    static async healthCheck(

        clientId: string

    ): Promise<boolean> {

        try {

            const spreadsheetId =
                await this.getSpreadsheetId(

                    clientId

                );


            const sheets =
                await this.getSheets(

                    clientId

                );


            await sheets

                .spreadsheets

                .get({

                    spreadsheetId

                });


            /*
            * Also verify that the expected Sheet1 exists.
            */

            const spreadsheet =
                await sheets

                    .spreadsheets

                    .get({

                        spreadsheetId,

                        fields:
                            "sheets.properties"

                    });


            const hasSheet1 =
                (
                    spreadsheet.data
                        .sheets ??
                    []
                ).some(

                    sheet =>
                        sheet.properties
                            ?.title ===
                        "Sheet1"

                );


            if (!hasSheet1) {

                throw new Error(
                    "The booking spreadsheet does not contain the expected Sheet1 worksheet."
                );

            }


            this.log(
                "Google Sheets connection healthy.",
                {
                    clientId
                }
            );


            return true;

        }

        catch (error) {

            console.error(
                "[Google Sheets] Health check failed."
            );

            return false;

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Google Error Normalization
    |--------------------------------------------------------------------------
    */

    private static normalizeGoogleError(

        error: unknown,

        fallback: string

    ): Error {

        const value =
            error as {

                message?: unknown;

                code?: unknown;

                response?: {

                    status?: unknown;

                    data?: {

                        error?: unknown;

                        error_description?: unknown;

                    };

                };

            };


        const status =
            Number(
                value?.response?.status ??
                value?.code
            );


        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */

        if (
            status === 401
        ) {

            return new Error(
                "Google authorization is no longer valid. Please reconnect the Google account."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Permission
        |--------------------------------------------------------------------------
        */

        if (
            status === 403
        ) {

            return new Error(
                "Google Sheets access was denied. Please reconnect the Google account and approve the required permissions."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Missing Spreadsheet
        |--------------------------------------------------------------------------
        */

        if (
            status === 404
        ) {

            return new Error(
                "The Google booking spreadsheet could not be found."
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

            return new Error(
                "Google Sheets rate limit reached. Please try again shortly."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Safe Message
        |--------------------------------------------------------------------------
        */

        if (
            typeof value?.message ===
            "string" &&
            value.message
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