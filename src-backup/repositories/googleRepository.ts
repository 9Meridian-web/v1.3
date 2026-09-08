import { supabase } from "../config/supabase";
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

        const { data, error } = await supabase

            .from("google_connections")

            .select("*")

            .eq("client_id", clientId)

            .maybeSingle();

        if (error) {

            throw new Error(error.message);

        }

        return data as GoogleConnection | null;

    }

    /*
    |--------------------------------------------------------------------------
    | Create / Update Connection
    |--------------------------------------------------------------------------
    */

    static async upsert(
        connection: GoogleConnection
    ): Promise<GoogleConnection> {

        const payload = {

            ...connection,

            updated_at: new Date().toISOString()

        };

        const { data, error } = await supabase

            .from("google_connections")

            .upsert(payload, {

                onConflict: "client_id"

            })

            .select()

            .single();

        if (error) {

            throw new Error(error.message);

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

        const { error } = await supabase

            .from("google_connections")

            .update({

                refresh_token: refreshToken,

                connected: true,

                updated_at: new Date().toISOString()

            })

            .eq("client_id", clientId);

        if (error) {

            throw new Error(error.message);

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Update Email
    |--------------------------------------------------------------------------
    */

    static async updateGoogleEmail(

        clientId: string,

        email: string

    ): Promise<void> {

        const { error } = await supabase

            .from("google_connections")

            .update({

                google_email: email,

                updated_at: new Date().toISOString()

            })

            .eq("client_id", clientId);

        if (error) {

            throw new Error(error.message);

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

        const { error } = await supabase

            .from("google_connections")

            .update({

                calendar_id: calendarId,

                updated_at: new Date().toISOString()

            })

            .eq("client_id", clientId);

        if (error) {

            throw new Error(error.message);

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

        const { error } = await supabase

            .from("google_connections")

            .update({

                spreadsheet_id: spreadsheetId,

                spreadsheet_name: spreadsheetName,

                updated_at: new Date().toISOString()

            })

            .eq("client_id", clientId);

        if (error) {

            throw new Error(error.message);

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

        const { error } = await supabase

            .from("google_connections")

            .update({

                connected: false,

                refresh_token: null,

                updated_at: new Date().toISOString()

            })

            .eq("client_id", clientId);

        if (error) {

            throw new Error(error.message);

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Delete Connection (Optional)
    |--------------------------------------------------------------------------
    */

    static async delete(
        clientId: string
    ): Promise<void> {

        const { error } = await supabase

            .from("google_connections")

            .delete()

            .eq("client_id", clientId);

        if (error) {

            throw new Error(error.message);

        }

    }

}