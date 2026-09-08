import { supabase } from "../config/supabase";

import { BusinessSettings } from "../types/businessSettings";

export class BusinessSettingsRepository {

    /*
    |--------------------------------------------------------------------------
    | Create Business Settings
    |--------------------------------------------------------------------------
    */

    static async create(

        settings: BusinessSettings

    ): Promise<BusinessSettings> {

        const {

            data,

            error

        } = await supabase

            .from("business_settings")

            .insert(settings)

            .select()

            .single();

        if (error) {

            throw new Error(error.message);

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Get Business Settings
    |--------------------------------------------------------------------------
    */

    static async getByClientId(

        clientId: string

    ): Promise<BusinessSettings> {

        const {

            data,

            error

        } = await supabase

            .from("business_settings")

            .select("*")

            .eq("client_id", clientId)

            .single();

        if (error) {

            throw new Error(error.message);

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Update Business Settings
    |--------------------------------------------------------------------------
    */

    static async update(

        clientId: string,

        updates: Partial<BusinessSettings>

    ): Promise<BusinessSettings> {

        const {

            data,

            error

        } = await supabase

            .from("business_settings")

            .update({

                ...updates,

                updated_at: new Date().toISOString()

            })

            .eq("client_id", clientId)

            .select()

            .single();

        if (error) {

            throw new Error(error.message);

        }

        return data;

    }

}