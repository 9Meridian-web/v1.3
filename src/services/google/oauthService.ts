import { google } from "googleapis";
import { createGoogleOAuthClient } from "../../config/googleOAuth";
import { supabase } from "../../config/supabase";
import { encryptSecret } from "../../helpers/secretCrypto";

export class OAuthService {
    /**
     * Handle Google OAuth callback.
     *
     * Important:
     * - Google may NOT return a refresh_token when reconnecting
     *   an already-authorized account.
     * - In that case, preserve the existing encrypted refresh token.
     * - Never store a new refresh token in plaintext.
     */
    static async handleCallback(
        code: string,
        clientId: string,
    ): Promise<{ googleEmail: string | null }> {
        if (!clientId?.trim()) {
            throw new Error("Client ID is required.");
        }

        if (!process.env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
            throw new Error(
                "GOOGLE_TOKEN_ENCRYPTION_KEY is not configured.",
            );
        }

        const oauth2Client = createGoogleOAuthClient();

        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        /*
         * Get the Google account associated with this OAuth connection.
         */
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: "v2",
        });

        const userInfo = await oauth2.userinfo.get();
        const googleEmail = userInfo.data.email ?? null;

        /*
         * Fetch the existing connection BEFORE updating it.
         *
         * This is important because Google does not always return
         * a refresh_token on subsequent OAuth authorizations.
         */
        const { data: existingConnection, error: existingError } =
            await supabase
                .from("google_connections")
                .select(
                    "refresh_token_encrypted, refresh_token",
                )
                .eq("client_id", clientId)
                .maybeSingle();

        if (existingError) {
            throw new Error(
                `Unable to read existing Google connection: ${existingError.message}`,
            );
        }

        /*
         * Google normally returns a refresh token on the initial
         * offline authorization.
         *
         * On reconnect, however, it may return only an access token.
         *
         * Therefore:
         *
         *   new refresh token -> encrypt and replace existing token
         *   no new token      -> preserve existing encrypted token
         */
        let refreshTokenEncrypted: string | null = null;

        if (tokens.refresh_token) {
            refreshTokenEncrypted = encryptSecret(
                tokens.refresh_token,
            );
        } else if (existingConnection?.refresh_token_encrypted) {
            refreshTokenEncrypted =
                existingConnection.refresh_token_encrypted;
        }

        /*
         * A connection without ANY refresh token cannot be used
         * for long-lived Google API access.
         *
         * Do not create/update a broken connection.
         */
        if (!refreshTokenEncrypted) {
            throw new Error(
                "Google did not return a refresh token and no existing encrypted refresh token was found. Reconnect and approve offline access.",
            );
        }

        /*
         * Always store the refresh token in the encrypted column.
         *
         * We intentionally DO NOT write to the plaintext
         * `refresh_token` column.
         */
        const { error } = await supabase
            .from("google_connections")
            .upsert(
                {
                    client_id: clientId,
                    google_email: googleEmail,
                    refresh_token_encrypted: refreshTokenEncrypted,
                    refresh_token: null,
                    connected: true,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "client_id",
                },
            );

        if (error) {
            throw new Error(
                `Unable to save Google connection: ${error.message}`,
            );
        }

        return {
            googleEmail,
        };
    }

    /**
     * Check whether Google is currently connected.
     */
    static async getConnectionStatus(
        clientId: string,
    ): Promise<boolean> {
        if (!clientId?.trim()) {
            return false;
        }

        const { data, error } = await supabase
            .from("google_connections")
            .select("connected")
            .eq("client_id", clientId)
            .maybeSingle();

        if (error) {
            throw new Error(
                `Unable to check Google connection status: ${error.message}`,
            );
        }

        return Boolean(data?.connected);
    }

    /**
     * Disconnect Google for this client.
     *
     * Both encrypted and legacy plaintext token columns are cleared.
     */
    static async disconnect(clientId: string): Promise<void> {
        if (!clientId?.trim()) {
            throw new Error("Client ID is required.");
        }

        const { error } = await supabase
            .from("google_connections")
            .update({
                connected: false,
                refresh_token: null,
                refresh_token_encrypted: null,
                google_email: null,
                updated_at: new Date().toISOString(),
            })
            .eq("client_id", clientId);

        if (error) {
            throw new Error(
                `Unable to disconnect Google: ${error.message}`,
            );
        }
    }
}