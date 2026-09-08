import { google } from "googleapis";
import { env } from "../../config/env";
import { supabase } from "../../config/supabase";
import { GoogleRepository } from "../../repositories/googleRepository";
import { decryptSecret } from "../../helpers/secretCrypto";

interface GoogleConnectionRow {
    id: string;
    client_id: string;
    connected: boolean;
    refresh_token: string | null;
    refresh_token_encrypted: string | null;
    google_email: string | null;
    calendar_id: string | null;
    spreadsheet_id: string | null;
    spreadsheet_name: string | null;
}

interface GoogleConnection
    extends GoogleConnectionRow {
    refreshToken: string;
}

type OAuth2Client =
    InstanceType<typeof google.auth.OAuth2>;

export class TokenManager {
    /**
     * Create a Google OAuth client.
     */
    private static createOAuthClient(): OAuth2Client {
        return new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            env.GOOGLE_REDIRECT_URI,
        );
    }

    /**
     * Load the Google connection for one client.
     */
    private static async getConnection(
        clientId: string,
    ): Promise<GoogleConnection> {
        const normalizedClientId =
            String(clientId ?? "").trim();

        if (!normalizedClientId) {
            throw new Error(
                "Client ID is required.",
            );
        }

        /*
         * The generated Supabase types are currently
         * out of sync with the google_connections table.
         *
         * We therefore type the returned row explicitly here.
         */
        const database = supabase as any;

        const {
            data,
            error,
        } = (await database
            .from("google_connections")
            .select(
                [
                    "id",
                    "client_id",
                    "connected",
                    "refresh_token",
                    "refresh_token_encrypted",
                    "google_email",
                    "calendar_id",
                    "spreadsheet_id",
                    "spreadsheet_name",
                ].join(","),
            )
            .eq(
                "client_id",
                normalizedClientId,
            )
            .maybeSingle()) as {
            data: GoogleConnectionRow | null;
            error: {
                message: string;
                code?: string;
                details?: string;
                hint?: string;
            } | null;
        };

        if (error) {
            throw new Error(
                `Unable to load Google connection: ${error.message}`,
            );
        }

        if (!data) {
            throw new Error(
                "Google connection not found.",
            );
        }

        if (!data.connected) {
            throw new Error(
                "Google account is disconnected.",
            );
        }

        let refreshToken: string | null =
            null;

        /*
         * Production path:
         * use the encrypted refresh token.
         */
        if (
            data.refresh_token_encrypted
        ) {
            try {
                refreshToken =
                    decryptSecret(
                        data.refresh_token_encrypted,
                    );
            } catch {
                throw new Error(
                    "Unable to decrypt the Google refresh token. Please reconnect your Google account.",
                );
            }
        }

        /*
         * Development / legacy fallback.
         *
         * Only use the plaintext column when the
         * encryption key is not configured.
         */
        if (
            !refreshToken &&
            !process.env
                .GOOGLE_TOKEN_ENCRYPTION_KEY &&
            data.refresh_token
        ) {
            refreshToken =
                data.refresh_token;
        }

        if (!refreshToken) {
            throw new Error(
                "Google refresh token is unavailable. Please reconnect your Google account.",
            );
        }

        return {
            id: data.id,
            client_id: data.client_id,
            connected: data.connected,
            refresh_token:
                data.refresh_token,
            refresh_token_encrypted:
                data.refresh_token_encrypted,
            google_email:
                data.google_email,
            calendar_id:
                data.calendar_id,
            spreadsheet_id:
                data.spreadsheet_id,
            spreadsheet_name:
                data.spreadsheet_name,
            refreshToken,
        };
    }

    /**
     * Detect Google's invalid_grant response.
     */
    private static isInvalidGrant(
        error: unknown,
    ): boolean {
        const err =
            error as {
                code?: unknown;
                message?: unknown;
                response?: {
                    data?: {
                        error?: unknown;
                        error_description?: unknown;
                    };
                };
            };

        const values: string[] = [
            err?.code,
            err?.message,
            err?.response?.data?.error,
            err?.response?.data
                ?.error_description,
        ]
            .filter(
                (
                    value,
                ): value is unknown =>
                    value !==
                        undefined &&
                    value !== null,
            )
            .map((value) =>
                String(value).toLowerCase(),
            );

        return values.some(
            (value) =>
                value.includes(
                    "invalid_grant",
                ) ||
                value.includes(
                    "invalid grant",
                ),
        );
    }

    /**
     * Get an authenticated Google OAuth client.
     */
    static async getOAuthClient(
        clientId: string,
    ): Promise<OAuth2Client> {
        const connection =
            await this.getConnection(
                clientId,
            );

        const client =
            this.createOAuthClient();

        client.setCredentials({
            refresh_token:
                connection.refreshToken,
        });

        try {
            /*
             * Force Google to validate the refresh token.
             */
            const access =
                await client.getAccessToken();

            if (!access.token) {
                throw new Error(
                    "Google did not return an access token.",
                );
            }

            return client;
        } catch (error) {
            if (
                this.isInvalidGrant(
                    error,
                )
            ) {
                try {
                    await GoogleRepository.disconnect(
                        clientId,
                    );
                } catch {
                    /*
                     * Preserve the original
                     * authentication error.
                     */
                }

                throw new Error(
                    "Google connection has expired or was revoked. Please reconnect your Google account.",
                );
            }

            if (
                error instanceof Error
            ) {
                throw new Error(
                    `Unable to authenticate with Google: ${error.message}`,
                );
            }

            throw new Error(
                "Unable to authenticate with Google.",
            );
        }
    }

    /**
     * Get a valid Google access token.
     *
     * The refresh token is never returned.
     */
    static async getAccessToken(
        clientId: string,
    ): Promise<string> {
        const client =
            await this.getOAuthClient(
                clientId,
            );

        try {
            const token =
                await client.getAccessToken();

            if (!token.token) {
                throw new Error(
                    "Google did not return an access token.",
                );
            }

            return token.token;
        } catch (error) {
            if (
                this.isInvalidGrant(
                    error,
                )
            ) {
                try {
                    await GoogleRepository.disconnect(
                        clientId,
                    );
                } catch {
                    // Preserve the authentication error.
                }

                throw new Error(
                    "Google connection has expired or was revoked. Please reconnect your Google account.",
                );
            }

            if (
                error instanceof Error
            ) {
                throw new Error(
                    `Unable to obtain Google access token: ${error.message}`,
                );
            }

            throw new Error(
                "Unable to obtain Google access token.",
            );
        }
    }
}