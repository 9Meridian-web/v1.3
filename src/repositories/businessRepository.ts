import { supabase } from "../config/supabase";

import { BusinessSettings } from "../types/businessSettings";

export class BusinessRepository {

    /*
    |--------------------------------------------------------------------------
    | Find Business Settings
    |--------------------------------------------------------------------------
    */

    static async findByClientId(

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

        if (

            error ||

            !data

        ) {

            throw new Error(

                "Business settings not found."

            );

        }

        return data as BusinessSettings;

    }

}