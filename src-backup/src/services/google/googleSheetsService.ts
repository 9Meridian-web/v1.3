import { google, sheets_v4 } from "googleapis";

import { supabase } from "../../config/supabase";

import { Booking, BookingStatus } from "../../types/booking";
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

export class GoogleSheetsService {

    /*
    |--------------------------------------------------------------------------
    | Google Sheets Client
    |--------------------------------------------------------------------------
    */

    private static async getSheets(

        clientId: string

    ): Promise<sheets_v4.Sheets> {

        const auth =

            await TokenManager.getOAuthClient(

                clientId

            );

        return google.sheets({

            version: "v4",

            auth

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Logger
    |--------------------------------------------------------------------------
    */

    private static log(

        message: string,

        data?: unknown

    ): void {

        console.log(

            "\n========== GOOGLE SHEETS =========="

        );

        console.log(message);

        if (data) {

            console.log(data);

        }

        console.log(

            "===================================\n"

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Spreadsheet ID
    |--------------------------------------------------------------------------
    */

    static async getSpreadsheetId(

        clientId: string

    ): Promise<string> {

        const {

            data,

            error

        } = await supabase

            .from("google_connections")

            .select(

                "spreadsheet_id"

            )

            .eq(

                "client_id",

                clientId

            )

            .single();

        if (error) {

            throw new Error(

                error.message

            );

        }

        if (

            data?.spreadsheet_id

        ) {

            return data.spreadsheet_id;

        }

        return await this.createSpreadsheet(

            clientId

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

            spreadsheet.data.spreadsheetId!;

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

        await supabase

            .from("google_connections")

            .update({

                spreadsheet_id:

                    spreadsheetId,

                spreadsheet_name:

                    "AI Receptionist Bookings"

            })

            .eq(

                "client_id",

                clientId

            );

        this.log(

            "Spreadsheet Created",

            spreadsheetId

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

            booking.customer_name,

            booking.customer_phone,

            booking.customer_email ?? "",

            DateFormatter.format(

                booking.appointment_date,

                client

            ),

            booking.appointment_time,

           booking.service_name,

            booking.reason ?? "",

            booking.status,

            booking.google_calendar_event_id ?? "",

            DateFormatter.format(

                booking.created_at ??

                new Date().toISOString(),

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

    try {

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

        const response =

            await sheets.spreadsheets.values.append({

                spreadsheetId,

                range: "Sheet1!A:K",

                valueInputOption: "RAW",

                insertDataOption: "INSERT_ROWS",

                requestBody: {

                    values: [

                        row

                    ]

                }

            });

        const updatedRange =

            response.data

                .updates

                ?.updatedRange;

        if (

            !updatedRange

        ) {

            throw new Error(

                "Unable to determine inserted row."

            );

        }

        const match = updatedRange.match(

            /![A-Z]+(\d+):/

        );

        if (

            !match

        ) {

            throw new Error(

                "Unable to parse inserted row."

            );

        }

        const sheetRow =

            Number(

                match[1]

            );

        if (

            booking.id

        ) {

            await BookingRepository.updateSheetRow(

                booking.id,

                sheetRow

            );

        }

        this.log(

            "Booking Appended",

            {

                bookingId:

                    booking.id,

                sheetRow

            }

        );

    }

    catch (error) {

        console.error(

            "Google Sheets Append Error",

            error

        );

        throw error;

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

    try {

        if (

            !booking.sheet_row

        ) {

            console.warn(

                "[Google Sheets] sheet_row is missing."

            );

            return;

        }

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

                    `Sheet1!A${booking.sheet_row}:K${booking.sheet_row}`,

                valueInputOption:

                    "RAW",

                requestBody: {

                    values: [

                        row

                    ]

                }

            });

        this.log(

            "Booking Updated",

            {

                bookingId:

                    booking.id,

                sheetRow:

                    booking.sheet_row

            }

        );

    }

    catch (error) {

        console.error(

            "Google Sheets Update Error",

            error

        );

        throw error;

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

    const spreadsheetId =

        await this.getSpreadsheetId(

            clientId

        );

    const sheets =

        await this.getSheets(

            clientId

        );

    const response =

        await sheets

            .spreadsheets

            .values

            .get({

                spreadsheetId,

                range: "Sheet1!A:A"

            });

    const rows =

        response.data.values ?? [];

    for (

        let i = 1;

        i < rows.length;

        i++

    ) {

        if (

            rows[i][0] === bookingId

        ) {

            return i + 1;

        }

    }

    return null;

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

    booking.status = status as BookingStatus;

    await this.updateBooking({

        booking,

        client

    });

    this.log(

        "Booking Status Updated",

        {

            bookingId: booking.id,

            status

        }

    );

}

/*
|--------------------------------------------------------------------------
| Delete Booking
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

        if (

            !booking.sheet_row

        ) {

            const row = await this.findSheetRow(

                booking.client_id,

                booking.id!

            );

            if (

                row

            ) {

                booking.sheet_row = row;

            }

        }

        if (

            !booking.sheet_row

        ) {

            console.warn(

                "[Google Sheets] Sheet row not found."

            );

            return;

        }

        await this.updateBookingStatus(

            booking,

            client,

            "cancelled"

        );

        this.log(

            "Booking Cancelled",

            {

                bookingId: booking.id,

                row: booking.sheet_row

            }

        );

    }

    catch (error) {

        console.error(

            "Google Sheets Delete Error",

            error

        );

        throw error;

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

    if (

        booking.sheet_row

    ) {

        return;

    }

    const row =

        await this.findSheetRow(

            booking.client_id,

            booking.id!

        );

    if (

        row

    ) {

        booking.sheet_row = row;

        await BookingRepository.updateSheetRow(

            booking.id!,

            row

        );

        this.log(

            "Sheet Row Synced",

            {

                bookingId: booking.id,

                row

            }

        );

    }

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

        await sheets.spreadsheets.get({

            spreadsheetId

        });

        this.log(

            "Google Sheets Connection Healthy"

        );

        return true;

    }

    catch (error) {

        console.error(

            "Google Sheets Health Check Failed",

            error

        );

        return false;

    }

}

}