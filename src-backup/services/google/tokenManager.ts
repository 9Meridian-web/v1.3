import { google } from "googleapis";

import { env } from "../../config/env";
import { supabase } from "../../config/supabase";

import { GoogleRepository } from "../../repositories/googleRepository";

export class TokenManager {

    /*
    |--------------------------------------------------------------------------
    | Create OAuth Client
    |--------------------------------------------------------------------------
    */

    private static createOAuthClient() {

        return new google.auth.OAuth2(

            env.GOOGLE_CLIENT_ID,

            env.GOOGLE_CLIENT_SECRET,

            env.GOOGLE_REDIRECT_URI

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Load Google Connection
    |--------------------------------------------------------------------------
    */

    private static async getConnection(
        clientId: string
    ) {

        console.log(
            "[TokenManager] Loading Google connection:",
            clientId
        );

        const { data, error } = await supabase

    .from("google_connections")

    .select("*")

    .eq("client_id", clientId)

    .maybeSingle();

console.log("Searching client:", clientId);
console.log("Google Connection:", data);
console.log("Supabase Error:", error);

        if (error) {

            throw new Error(error.message);

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

        if (!data.refresh_token) {

            throw new Error(
                "Refresh token not found."
            );

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | OAuth Client
    |--------------------------------------------------------------------------
    */

    static async getOAuthClient(
        clientId: string
    ) {

        const connection =
            await this.getConnection(
                clientId
            );

        const client =
            this.createOAuthClient();

        client.setCredentials({

            refresh_token:
                connection.refresh_token

        });

        try {

            const access =
                await client.getAccessToken();

            console.log(

                "[TokenManager] Access token generated."

            );

            if (!access.token) {

                throw new Error(
                    "Unable to generate access token."
                );

            }

            return client;

        }

        catch (error: any) {

            console.error(
                "[TokenManager] Token refresh failed."
            );

            console.error(
                error.response?.data ??
                error.message
            );

            /*
            |--------------------------------------------------------------
            | Refresh Token Revoked
            |--------------------------------------------------------------
            */

            if (

                error?.response?.data?.error ===
                "invalid_grant"

            ) {

                await GoogleRepository.disconnect(
                    clientId
                );

                throw new Error(

                    "Google connection has expired. Please reconnect your Google account."

                );

            }

            throw error;

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Access Token
    |--------------------------------------------------------------------------
    */

    static async getAccessToken(
        clientId: string
    ): Promise<string> {

        const client =
            await this.getOAuthClient(
                clientId
            );

        const token =
            await client.getAccessToken();

        if (!token.token) {

            throw new Error(
                "Unable to generate access token."
            );

        }

        return token.token;

    }

}