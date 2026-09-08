import {
    getGoogleAuthUrl,
    createGoogleOAuthClient,
} from "../../config/googleOAuth";

import { GoogleRepository } from "../../repositories/googleRepository";
import { GoogleCalendarHelper } from "../../helpers/googleCalendar";
import { GoogleConnection } from "../../types/google";
import { AppError } from "../../errors/AppError";
import { supabase } from "../../config/supabase";
import { env } from "../../config/env";
import { decryptSecret } from "../../helpers/secretCrypto";
import { TokenManager } from "./tokenManager";


export class GoogleService {

    /*
    |--------------------------------------------------------------------------
    | Get Google Connect URL
    |--------------------------------------------------------------------------
    */

    static getConnectUrl(
        userId: string,
        clientId: string
    ): string {

        if (!userId?.trim()) {
            throw new AppError(
                "User ID is required.",
                400
            );
        }

        if (!clientId?.trim()) {
            throw new AppError(
                "Client ID is required.",
                400
            );
        }

        return getGoogleAuthUrl(
            userId,
            clientId
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Resolve Existing Refresh Token
    |--------------------------------------------------------------------------
    |
    | Google does NOT guarantee that a refresh_token is returned every
    | time an already-authorized account goes through OAuth again.
    |
    | Therefore:
    |
    |   new refresh token -> use it
    |   no new token      -> decrypt existing token
    |
    |--------------------------------------------------------------------------
    */

    private static async getExistingRefreshToken(
        clientId: string
    ): Promise<string | null> {

        const connection =
            await GoogleRepository.findByClientId(
                clientId
            );

        if (!connection) {
            return null;
        }

        const connectionWithEncryption =
            connection as GoogleConnection & {
                refresh_token_encrypted?: string | null;
            };

        /*
         * Production source of truth.
         */
        if (
            connectionWithEncryption
                .refresh_token_encrypted
        ) {

            try {

                return decryptSecret(
                    connectionWithEncryption
                        .refresh_token_encrypted
                );

            } catch {

                throw new AppError(
                    "Unable to decrypt the existing Google connection. Please reconnect your Google account.",
                    500
                );
            }
        }

        /*
         * Legacy/development fallback.
         *
         * Only allow plaintext when encryption is not configured.
         */
        if (
            !env.GOOGLE_TOKEN_ENCRYPTION_KEY &&
            connection.refresh_token
        ) {

            return connection.refresh_token;
        }

        return null;
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

        if (!code?.trim()) {
            throw new AppError(
                "Google authorization code is required.",
                400
            );
        }

        if (!clientId?.trim()) {
            throw new AppError(
                "Client ID is required.",
                400
            );
        }

        try {

            /*
            |--------------------------------------------------------------------------
            | Exchange Authorization Code
            |--------------------------------------------------------------------------
            */

            const oauthClient =
                createGoogleOAuthClient();

            const {
                tokens
            } = await oauthClient.getToken(
                code
            );

            /*
             * Google may return a new refresh token on the first
             * authorization, but may omit it on reconnect.
             */
            let refreshToken =
                tokens.refresh_token ??
                null;


            /*
            |--------------------------------------------------------------------------
            | Existing Refresh Token
            |--------------------------------------------------------------------------
            */

            if (!refreshToken) {

                refreshToken =
                    await this.getExistingRefreshToken(
                        clientId
                    );
            }


            /*
            |--------------------------------------------------------------------------
            | Require a usable refresh token
            |--------------------------------------------------------------------------
            */

            if (!refreshToken) {

                throw new AppError(
                    "Google did not provide a refresh token and no existing Google refresh token was found. Please reconnect your Google account and approve offline access.",
                    400
                );
            }


            /*
            |--------------------------------------------------------------------------
            | Configure OAuth Client
            |--------------------------------------------------------------------------
            */

            oauthClient.setCredentials({
                ...tokens,
                refresh_token:
                    refreshToken
            });


            /*
            |--------------------------------------------------------------------------
            | Validate Google Authentication
            |--------------------------------------------------------------------------
            |
            | This makes sure the token actually works before we mark
            | the connection as connected.
            |
            */

            try {

                const accessToken =
                    await oauthClient.getAccessToken();

                if (!accessToken.token) {

                    throw new AppError(
                        "Google did not return a usable access token.",
                        401
                    );
                }

            } catch (error: any) {

                const googleError =
                    String(
                        error?.response?.data?.error ??
                        error?.code ??
                        error?.message ??
                        ""
                    ).toLowerCase();

                if (
                    googleError.includes(
                        "invalid_grant"
                    )
                ) {

                    throw new AppError(
                        "Google authorization has expired or was revoked. Please reconnect your Google account.",
                        401
                    );
                }

                throw error;
            }


            /*
            |--------------------------------------------------------------------------
            | Google Profile
            |--------------------------------------------------------------------------
            */

            const googleEmail =
                await GoogleCalendarHelper.getUserEmail(
                    refreshToken
                );


            /*
            |--------------------------------------------------------------------------
            | Primary Calendar
            |--------------------------------------------------------------------------
            */

            const calendarId =
                await GoogleCalendarHelper.getPrimaryCalendar(
                    refreshToken
                );


            /*
            |--------------------------------------------------------------------------
            | Existing Connection
            |--------------------------------------------------------------------------
            */

            const existingConnection =
                await GoogleRepository.findByClientId(
                    clientId
                );


            /*
            |--------------------------------------------------------------------------
            | Existing Spreadsheet
            |--------------------------------------------------------------------------
            */

            let spreadsheetId =
                existingConnection
                    ?.spreadsheet_id ??
                null;

            let spreadsheetName =
                existingConnection
                    ?.spreadsheet_name ??
                null;


            /*
            |--------------------------------------------------------------------------
            | Spreadsheet
            |--------------------------------------------------------------------------
            |
            | Only create a spreadsheet if this client does not already
            | have one saved.
            |
            */

            if (
                !spreadsheetId ||
                !spreadsheetName
            ) {

                const spreadsheet =
                    await GoogleCalendarHelper.createSpreadsheet(
                        refreshToken,
                        "AI Receptionist Bookings"
                    );

                spreadsheetId =
                    spreadsheet.spreadsheetId;

                spreadsheetName =
                    spreadsheet.spreadsheetName;


                if (
                    !spreadsheetId ||
                    !spreadsheetName
                ) {

                    throw new AppError(
                        "Google Spreadsheet was created but its details could not be retrieved.",
                        502
                    );
                }


                await GoogleCalendarHelper.initializeBookingSheet(
                    refreshToken,
                    spreadsheetId
                );
            }


            /*
            |--------------------------------------------------------------------------
            | Build Connection Payload
            |--------------------------------------------------------------------------
            */

            const payload: GoogleConnection = {

                client_id:
                    clientId,

                google_email:
                    googleEmail,

                /*
                 * Repository encrypts this before storing it.
                 */
                refresh_token:
                    refreshToken,

                calendar_id:
                    calendarId,

                spreadsheet_id:
                    spreadsheetId,

                spreadsheet_name:
                    spreadsheetName,

                connected:
                    true
            };


            /*
            |--------------------------------------------------------------------------
            | Save Google Connection
            |--------------------------------------------------------------------------
            */

            const connection =
                await GoogleRepository.upsert(
                    payload
                );


            /*
            |--------------------------------------------------------------------------
            | Update Client Onboarding Status
            |--------------------------------------------------------------------------
            */

            const {
                error: clientUpdateError
            } = await supabase
                .from("clients")
                .update({
                    onboarding_status:
                        "google_connected",

                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    clientId
                );


            if (clientUpdateError) {

                throw new AppError(
                    `Google connected successfully, but client onboarding status could not be updated: ${clientUpdateError.message}`,
                    500
                );
            }


            return connection;

        } catch (error: any) {

            /*
            |--------------------------------------------------------------------------
            | Invalid Grant
            |--------------------------------------------------------------------------
            */

            const errorCode =
                String(
                    error?.response?.data?.error ??
                    error?.code ??
                    ""
                ).toLowerCase();


            if (
                errorCode ===
                    "invalid_grant" ||
                errorCode.includes(
                    "invalid_grant"
                )
            ) {

                try {

                    await GoogleRepository.disconnect(
                        clientId
                    );

                } catch {
                    // Preserve the original OAuth error.
                }


                throw new AppError(
                    "Google authorization expired or was revoked. Please reconnect your Google account.",
                    401
                );
            }


            /*
            |--------------------------------------------------------------------------
            | Redirect URI
            |--------------------------------------------------------------------------
            */

            if (
                errorCode ===
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
                errorCode ===
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
            await GoogleRepository.findByClientId(
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
                connection.connected ??
                false,

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

        return await GoogleRepository.findByClientId(
            clientId
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Connected?
    |--------------------------------------------------------------------------
    */

    static async isConnected(
        clientId: string
    ): Promise<boolean> {

        const connection =
            await this.getConnection(
                clientId
            );

        return connection?.connected ??
            false;
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

        await GoogleRepository.updateSpreadsheet(
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

        await GoogleRepository.updateCalendar(
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

        await GoogleRepository.updateRefreshToken(
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


        /*
         * IMPORTANT:
         *
         * Do NOT check connection.refresh_token here.
         *
         * In production it is intentionally NULL because the
         * actual token is stored in refresh_token_encrypted.
         *
         * TokenManager performs the real credential validation.
         */
        try {

            await TokenManager.getOAuthClient(
                clientId
            );

        } catch (error: any) {

            throw new AppError(
                error?.message ??
                    "Google connection could not be validated.",
                401
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


        await GoogleRepository.disconnect(
            clientId
        );


        /*
         * Keep onboarding state consistent.
         */
        await supabase
            .from("clients")
            .update({
                onboarding_status:
                    "payment_completed",

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                clientId
            );
    }
}