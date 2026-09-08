import { google } from "googleapis";
import { oauth2Client, GOOGLE_SCOPES } from "../../config/google";
import { supabase } from "../../config/supabase";

export class OAuthService {

    /*
    |--------------------------------------------------------------------------
    | Generate Google OAuth URL
    |--------------------------------------------------------------------------
    */

    static generateAuthUrl(clientId: string): string {

        return oauth2Client.generateAuthUrl({

            access_type: "offline",

            prompt: "consent",

            scope: GOOGLE_SCOPES,

            state: clientId

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Handle Google Callback
    |--------------------------------------------------------------------------
    */

    static async handleCallback(
        code: string,
        clientId: string
    ) {

        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {

            throw new Error(
                "Google did not return a refresh token."
            );

        }

        oauth2Client.setCredentials(tokens);

        /*
        |--------------------------------------------------------------------------
        | Fetch Google Account Email
        |--------------------------------------------------------------------------
        */

        const oauth2 = google.oauth2({

            auth: oauth2Client,

            version: "v2"

        });

        const userInfo = await oauth2.userinfo.get();

        const googleEmail = userInfo.data.email ?? null;

        /*
        |--------------------------------------------------------------------------
        | Save Google Connection
        |--------------------------------------------------------------------------
        */

        const { error } = await supabase

            .from("google_connections")

            .upsert({

                client_id: clientId,

                google_email: googleEmail,

                refresh_token: tokens.refresh_token,

                connected: true,

                updated_at: new Date().toISOString()

            });

        if (error) {

            throw new Error(error.message);

        }

        return tokens;

    }

    /*
    |--------------------------------------------------------------------------
    | Get Connection Status
    |--------------------------------------------------------------------------
    */

    static async getConnectionStatus(
        clientId: string
    ): Promise<boolean> {

        const { data, error } = await supabase

            .from("google_connections")

            .select("connected")

            .eq("client_id", clientId)

            .single();

        if (error || !data) {

            return false;

        }

        return data.connected;

    }

    /*
    |--------------------------------------------------------------------------
    | Disconnect Google
    |--------------------------------------------------------------------------
    */

    static async disconnect(
        clientId: string
    ): Promise<void> {

        const { error } = await supabase

            .from("google_connections")

            .update({

                connected: false,

                refresh_token: null,

                google_email: null,

                updated_at: new Date().toISOString()

            })

            .eq("client_id", clientId);

        if (error) {

            throw new Error(error.message);

        }

    }

}