import { supabase } from "../config/supabase";
import { env } from "../config/env";
import { encryptSecret } from "../helpers/secretCrypto";
import { GoogleConnection } from "../types/google";

export class GoogleRepository {

    /*
    |--------------------------------------------------------------------------
    | Get Connection
    |--------------------------------------------------------------------------
    */

    static async findByClientId(
        clientId: string
    ): Promise<GoogleConnection | null> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        if (!normalizedClientId) {
            throw new Error("Client ID is required.");
        }

        /*
         * The Supabase generated types may not always be synchronized
         * with the current google_connections schema.
         *
         * Runtime data is explicitly cast to GoogleConnection below.
         */
        const database = supabase as any;

        const {
            data,
            error
        } = await database
            .from("google_connections")
            .select("*")
            .eq(
                "client_id",
                normalizedClientId
            )
            .maybeSingle();

        if (error) {
            throw new Error(
                `Unable to load Google connection: ${error.message}`
            );
        }

        return data as GoogleConnection | null;
    }


    /*
    |--------------------------------------------------------------------------
    | Create / Update Connection
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | If a new refresh token is supplied:
    |     encrypt and save it.
    |
    | If no refresh token is supplied:
    |     preserve the existing encrypted token.
    |
    | This prevents OAuth reconnects from destroying a valid
    | long-lived Google credential.
    |--------------------------------------------------------------------------
    */

    static async upsert(
        connection: GoogleConnection
    ): Promise<GoogleConnection> {

        if (!connection.client_id) {
            throw new Error("Client ID is required.");
        }

        const database = supabase as any;

        /*
         * Load the existing connection first.
         *
         * Google may omit refresh_token on subsequent OAuth
         * authorizations.
         */
        const {
            data: existing,
            error: existingError
        } = await database
            .from("google_connections")
            .select(
                "refresh_token,refresh_token_encrypted"
            )
            .eq(
                "client_id",
                connection.client_id
            )
            .maybeSingle();

        if (existingError) {
            throw new Error(
                `Unable to load existing Google connection: ${existingError.message}`
            );
        }

        const encryptionEnabled =
            Boolean(
                env.GOOGLE_TOKEN_ENCRYPTION_KEY
            );

        const payload: Record<
            string,
            unknown
        > = {
            ...connection,

            client_id:
                connection.client_id,

            connected:
                connection.connected ?? true,

            updated_at:
                new Date().toISOString()
        };


        /*
         * --------------------------------------------------------------
         * Refresh-token handling
         * --------------------------------------------------------------
         */

        if (
            connection.refresh_token &&
            connection.refresh_token.trim()
        ) {

            if (encryptionEnabled) {

                /*
                 * Production:
                 * store ONLY the encrypted token.
                 */
                payload.refresh_token =
                    null;

                payload.refresh_token_encrypted =
                    encryptSecret(
                        connection.refresh_token
                    );

            } else {

                /*
                 * Development/legacy compatibility.
                 */
                payload.refresh_token =
                    connection.refresh_token;

                payload.refresh_token_encrypted =
                    null;
            }

        } else if (
            encryptionEnabled &&
            existing?.refresh_token_encrypted
        ) {

            /*
             * Google didn't send a new refresh token.
             *
             * KEEP the existing encrypted token.
             */
            payload.refresh_token =
                null;

            payload.refresh_token_encrypted =
                existing.refresh_token_encrypted;

        } else if (
            !encryptionEnabled &&
            existing?.refresh_token
        ) {

            /*
             * Legacy/development compatibility:
             * preserve the existing plaintext token.
             */
            payload.refresh_token =
                existing.refresh_token;

            payload.refresh_token_encrypted =
                null;

        } else {

            /*
             * No token exists yet.
             */
            payload.refresh_token =
                null;

            payload.refresh_token_encrypted =
                null;
        }


        /*
         * --------------------------------------------------------------
         * Save connection
         * --------------------------------------------------------------
         */

        const {
            data,
            error
        } = await database
            .from("google_connections")
            .upsert(
                payload,
                {
                    onConflict:
                        "client_id"
                }
            )
            .select("*")
            .single();

        if (error) {
            throw new Error(
                `Unable to save Google connection: ${error.message}`
            );
        }

        return data as GoogleConnection;
    }


    /*
    |--------------------------------------------------------------------------
    | Update Refresh Token
    |--------------------------------------------------------------------------
    */

    static async updateRefreshToken(
        clientId: string,
        refreshToken: string
    ): Promise<void> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        const normalizedRefreshToken =
            String(refreshToken ?? "").trim();

        if (!normalizedClientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        if (!normalizedRefreshToken) {
            throw new Error(
                "Refresh token is required."
            );
        }

        const database = supabase as any;

        const encryptionEnabled =
            Boolean(
                env.GOOGLE_TOKEN_ENCRYPTION_KEY
            );

        const updatePayload: Record<
            string,
            unknown
        > = {
            connected: true,
            updated_at:
                new Date().toISOString()
        };

        if (encryptionEnabled) {

            /*
             * Production:
             * plaintext token is never stored.
             */
            updatePayload.refresh_token =
                null;

            updatePayload.refresh_token_encrypted =
                encryptSecret(
                    normalizedRefreshToken
                );

        } else {

            updatePayload.refresh_token =
                normalizedRefreshToken;

            updatePayload.refresh_token_encrypted =
                null;
        }

        const {
            error
        } = await database
            .from("google_connections")
            .update(
                updatePayload
            )
            .eq(
                "client_id",
                normalizedClientId
            );

        if (error) {
            throw new Error(
                `Unable to update Google refresh token: ${error.message}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Update Google Email
    |--------------------------------------------------------------------------
    */

    static async updateGoogleEmail(
        clientId: string,
        email: string
    ): Promise<void> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        const normalizedEmail =
            String(email ?? "").trim();

        if (!normalizedClientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        if (!normalizedEmail) {
            throw new Error(
                "Google email is required."
            );
        }

        const database = supabase as any;

        const {
            error
        } = await database
            .from("google_connections")
            .update({
                google_email:
                    normalizedEmail,

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "client_id",
                normalizedClientId
            );

        if (error) {
            throw new Error(
                `Unable to update Google email: ${error.message}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Update Calendar
    |--------------------------------------------------------------------------
    */

    static async updateCalendar(
        clientId: string,
        calendarId: string
    ): Promise<void> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        const normalizedCalendarId =
            String(calendarId ?? "").trim();

        if (!normalizedClientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        if (!normalizedCalendarId) {
            throw new Error(
                "Calendar ID is required."
            );
        }

        const database = supabase as any;

        const {
            error
        } = await database
            .from("google_connections")
            .update({
                calendar_id:
                    normalizedCalendarId,

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "client_id",
                normalizedClientId
            );

        if (error) {
            throw new Error(
                `Unable to update Google Calendar: ${error.message}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Update Spreadsheet
    |--------------------------------------------------------------------------
    */

    static async updateSpreadsheet(
        clientId: string,
        spreadsheetId: string,
        spreadsheetName: string
    ): Promise<void> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        const normalizedSpreadsheetId =
            String(spreadsheetId ?? "").trim();

        const normalizedSpreadsheetName =
            String(spreadsheetName ?? "").trim();

        if (!normalizedClientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        if (!normalizedSpreadsheetId) {
            throw new Error(
                "Spreadsheet ID is required."
            );
        }

        if (!normalizedSpreadsheetName) {
            throw new Error(
                "Spreadsheet name is required."
            );
        }

        const database = supabase as any;

        const {
            error
        } = await database
            .from("google_connections")
            .update({
                spreadsheet_id:
                    normalizedSpreadsheetId,

                spreadsheet_name:
                    normalizedSpreadsheetName,

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "client_id",
                normalizedClientId
            );

        if (error) {
            throw new Error(
                `Unable to update Google Spreadsheet: ${error.message}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Disconnect
    |--------------------------------------------------------------------------
    */

    static async disconnect(
        clientId: string
    ): Promise<void> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        if (!normalizedClientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        const database = supabase as any;

        const {
            error
        } = await database
            .from("google_connections")
            .update({

                connected: false,

                /*
                 * Completely remove both forms of the
                 * long-lived Google credential.
                 */
                refresh_token:
                    null,

                refresh_token_encrypted:
                    null,

                updated_at:
                    new Date().toISOString()

            })
            .eq(
                "client_id",
                normalizedClientId
            );

        if (error) {
            throw new Error(
                `Unable to disconnect Google: ${error.message}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Delete Connection
    |--------------------------------------------------------------------------
    */

    static async delete(
        clientId: string
    ): Promise<void> {

        const normalizedClientId =
            String(clientId ?? "").trim();

        if (!normalizedClientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        const database = supabase as any;

        const {
            error
        } = await database
            .from("google_connections")
            .delete()
            .eq(
                "client_id",
                normalizedClientId
            );

        if (error) {
            throw new Error(
                `Unable to delete Google connection: ${error.message}`
            );
        }
    }
}