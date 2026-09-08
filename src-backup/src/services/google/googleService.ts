import {
    googleOAuthClient,
    getGoogleAuthUrl
} from "../../config/googleOAuth";

import { GoogleRepository } from "../../repositories/googleRepository";
import { GoogleCalendarHelper } from "../../helpers/googleCalendar";

import { GoogleConnection } from "../../types/google";

import { AppError } from "../../errors/AppError";

export class GoogleService {

    /*
    |--------------------------------------------------------------------------
    | Connect Google
    |--------------------------------------------------------------------------
    */

    static getConnectUrl(
        clientId: string
    ): string {

        return getGoogleAuthUrl(
            clientId
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Google OAuth Callback
    |--------------------------------------------------------------------------
    */

    static async handleCallback(

        code: string,

        clientId: string

    ): Promise<GoogleConnection> {

        console.log("");

        console.log("======================================================");
        console.log("🟢 GOOGLE OAUTH CALLBACK");
        console.log("======================================================");

        console.log("Client ID :", clientId);

        try {

            /*
            |--------------------------------------------------------------------------
            | Exchange Authorization Code
            |--------------------------------------------------------------------------
            */

            console.log("🔄 Exchanging authorization code...");

            const { tokens } =

                await googleOAuthClient.getToken(

                    code

                );

            const refreshToken =
                tokens.refresh_token;

            if (!refreshToken) {

                throw new AppError(

                    "Google didn't return a refresh token. Disconnect your Google account and reconnect again.",

                    400

                );

            }

            console.log("✅ Refresh Token Received");

            /*
            |--------------------------------------------------------------------------
            | Google Profile
            |--------------------------------------------------------------------------
            */

            console.log("📧 Loading Google Account...");

            const googleEmail =

                await GoogleCalendarHelper

                    .getUserEmail(

                        refreshToken

                    );

            console.log("Google Email :", googleEmail);

            /*
            |--------------------------------------------------------------------------
            | Primary Calendar
            |--------------------------------------------------------------------------
            */

            console.log("📅 Loading Primary Calendar...");

            const calendarId =

                await GoogleCalendarHelper

                    .getPrimaryCalendar(

                        refreshToken

                    );

            console.log("Calendar ID :", calendarId);

            /*
            |--------------------------------------------------------------------------
            | Existing Connection
            |--------------------------------------------------------------------------
            */

            console.log("🔍 Checking Existing Connection...");

            const existingConnection =

                await GoogleRepository

                    .findByClientId(

                        clientId

                    );

            let spreadsheetId =
                existingConnection?.spreadsheet_id;

            let spreadsheetName =
                existingConnection?.spreadsheet_name;

            /*
            |--------------------------------------------------------------------------
            | Spreadsheet
            |--------------------------------------------------------------------------
            */

            if (

                !spreadsheetId ||

                !spreadsheetName

            ) {

                console.log("");

                console.log("📄 No Spreadsheet Found");

                console.log("Creating Booking Spreadsheet...");

                const spreadsheet =

                    await GoogleCalendarHelper

                        .createSpreadsheet(

                            refreshToken,

                            "AI Receptionist Bookings"

                        );

                spreadsheetId =

                    spreadsheet.spreadsheetId;

                spreadsheetName =

                    spreadsheet.spreadsheetName;

                console.log(

                    "Spreadsheet Created :",

                    spreadsheetName

                );

                await GoogleCalendarHelper

                    .initializeBookingSheet(

                        refreshToken,

                        spreadsheetId

                    );

                console.log(

                    "Booking Sheet Initialized"

                );

            }

            else {

                console.log("");

                console.log(

                    "✅ Existing Spreadsheet Found"

                );

                console.log(

                    spreadsheetName

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Build Connection Payload
            |--------------------------------------------------------------------------
            */

            const payload: GoogleConnection = {

                client_id: clientId,

                google_email: googleEmail,

                refresh_token: refreshToken,

                calendar_id: calendarId,

                spreadsheet_id: spreadsheetId,

                spreadsheet_name: spreadsheetName,

                connected: true

            };

            console.log("");

            console.log("Saving Google Connection...");

            console.table(payload);

            /*
            |--------------------------------------------------------------------------
            | Save Google Connection
            |--------------------------------------------------------------------------
            */

            const connection =

                await GoogleRepository

                    .upsert(

                        payload

                    );

            console.log("");

            console.log("✅ Google Connected Successfully");

            console.log("");

            console.log("Google Account");

            console.log("------------------------------");

            console.log(

                "Email        :",

                connection.google_email

            );

            console.log(

                "Calendar     :",

                connection.calendar_id

            );

            console.log(

                "Spreadsheet  :",

                connection.spreadsheet_name

            );

            console.log(

                "Spreadsheet ID :",

                connection.spreadsheet_id

            );

            console.log(

                "Connected    :",

                connection.connected

            );

            console.log("");

            console.log("======================================================");

            console.log("🎉 GOOGLE SETUP COMPLETED");

            console.log("======================================================");

            console.log("");

            return connection;

        }

        catch (error: any) {

            console.log("");

            console.log("======================================================");

            console.log("❌ GOOGLE OAUTH FAILED");

            console.log("======================================================");

            console.error(error);

            /*
            |--------------------------------------------------------------------------
            | Google API Response
            |--------------------------------------------------------------------------
            */

            if (

                error?.response?.data

            ) {

                console.error(

                    "Google Response:",

                    error.response.data

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Invalid Grant
            |--------------------------------------------------------------------------
            */

            if (

                error?.response?.data?.error ===

                "invalid_grant"

            ) {

                throw new AppError(

                    "Google authorization expired. Please reconnect your Google account.",

                    401

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Redirect URI
            |--------------------------------------------------------------------------
            */

            if (

                error?.response?.data?.error ===

                "redirect_uri_mismatch"

            ) {

                throw new AppError(

                    "Google OAuth redirect URI mismatch.",

                    500

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Access Denied
            |--------------------------------------------------------------------------
            */

            if (

                error?.response?.data?.error ===

                "access_denied"

            ) {

                throw new AppError(

                    "Google authorization was cancelled by the user.",

                    400

                );

            }

            /*
            |--------------------------------------------------------------------------
            | Existing AppError
            |--------------------------------------------------------------------------
            */

            if (

                error instanceof AppError

            ) {

                throw error;

            }

            /*
            |--------------------------------------------------------------------------
            | Unknown Error
            |--------------------------------------------------------------------------
            */

            throw new AppError(

                error?.message ??

                "Failed to connect Google account.",

                500

            );

        }

    }
        /*
    |--------------------------------------------------------------------------
    | Google Connection Status
    |--------------------------------------------------------------------------
    */

    static async getStatus(

        clientId: string

    ) {

        const connection =

            await GoogleRepository

                .findByClientId(

                    clientId

                );

        if (!connection) {

            return {

                connected: false,

                google_email: null,

                calendar_id: null,

                spreadsheet_id: null,

                spreadsheet_name: null

            };

        }

        return {

            connected:
                connection.connected ?? false,

            google_email:
                connection.google_email,

            calendar_id:
                connection.calendar_id,

            spreadsheet_id:
                connection.spreadsheet_id,

            spreadsheet_name:
                connection.spreadsheet_name

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Get Connection
    |--------------------------------------------------------------------------
    */

    static async getConnection(

        clientId: string

    ): Promise<GoogleConnection | null> {

        return await GoogleRepository

            .findByClientId(

                clientId

            );

    }

    /*
    |--------------------------------------------------------------------------
    | Connected ?
    |--------------------------------------------------------------------------
    */

    static async isConnected(

        clientId: string

    ): Promise<boolean> {

        const connection =

            await this.getConnection(

                clientId

            );

        return connection?.connected ?? false;

    }

    /*
    |--------------------------------------------------------------------------
    | Save Spreadsheet
    |--------------------------------------------------------------------------
    */

    static async saveSpreadsheet(

        clientId: string,

        spreadsheetId: string,

        spreadsheetName: string

    ): Promise<void> {

        await GoogleRepository

            .updateSpreadsheet(

                clientId,

                spreadsheetId,

                spreadsheetName

            );

    }

    /*
    |--------------------------------------------------------------------------
    | Save Calendar
    |--------------------------------------------------------------------------
    */

    static async saveCalendar(

        clientId: string,

        calendarId: string

    ): Promise<void> {

        await GoogleRepository

            .updateCalendar(

                clientId,

                calendarId

            );

    }

    /*
    |--------------------------------------------------------------------------
    | Refresh Token
    |--------------------------------------------------------------------------
    */

    static async updateRefreshToken(

        clientId: string,

        refreshToken: string

    ): Promise<void> {

        await GoogleRepository

            .updateRefreshToken(

                clientId,

                refreshToken

            );

    }

    /*
    |--------------------------------------------------------------------------
    | Validate Connection
    |--------------------------------------------------------------------------
    */

    static async validateConnection(

        clientId: string

    ): Promise<GoogleConnection> {

        const connection =

            await this.getConnection(

                clientId

            );

        if (

            !connection ||

            !connection.connected

        ) {

            throw new AppError(

                "Google account is not connected.",

                400

            );

        }

        if (

            !connection.refresh_token

        ) {

            throw new AppError(

                "Google refresh token is missing.",

                400

            );

        }

        return connection;

    }

    /*
    |--------------------------------------------------------------------------
    | Disconnect
    |--------------------------------------------------------------------------
    */

    static async disconnect(

        clientId: string

    ): Promise<void> {

        const connection =

            await this.getConnection(

                clientId

            );

        if (!connection) {

            throw new AppError(

                "Google connection not found.",

                404

            );

        }

        await GoogleRepository

            .disconnect(

                clientId

            );

        console.log("");

        console.log("==========================================");

        console.log("🔴 GOOGLE DISCONNECTED");

        console.log("==========================================");

        console.log(

            "Client :", clientId

        );

        console.log(

            "Google :", connection.google_email

        );

        console.log("");

    }

}