import { supabase } from "../config/supabase";

import { Client } from "../types/client";

export class ClientRepository {

    /*
    |--------------------------------------------------------------------------
    | Create Client
    |--------------------------------------------------------------------------
    */

    static async create(

        client: Client

    ): Promise<Client> {

        const {

            data,

            error

        } = await supabase

            .from("clients")

            .insert(client)

            .select()

            .single();

        if (error) {

            throw new Error(error.message);

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Get Client
    |--------------------------------------------------------------------------
    */

    static async get(

        clientId: string

    ): Promise<Client> {

        const {

            data,

            error

        } = await supabase

            .from("clients")

            .select("*")

            .eq("id", clientId)

            .single();

        if (error) {

            throw new Error(error.message);

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Get All Clients
    |--------------------------------------------------------------------------
    */

    static async getAll(): Promise<Client[]> {

        const {

            data,

            error

        } = await supabase

            .from("clients")

            .select("*")

            .order(

                "created_at",

                {

                    ascending: false

                }

            );

        if (error) {

            throw new Error(error.message);

        }

        return data ?? [];

    }

    /*
    |--------------------------------------------------------------------------
    | Update Client
    |--------------------------------------------------------------------------
    */

    static async update(

        clientId: string,

        updates: Partial<Client>

    ): Promise<Client> {

        const {

            data,

            error

        } = await supabase

            .from("clients")

            .update({

                ...updates,

                updated_at: new Date().toISOString()

            })

            .eq("id", clientId)

            .select()

            .single();

        if (error) {

            throw new Error(error.message);

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Delete Client
    |--------------------------------------------------------------------------
    */

    static async delete(

        clientId: string

    ): Promise<void> {

        const {

            error

        } = await supabase

            .from("clients")

            .delete()

            .eq("id", clientId);

        if (error) {

            throw new Error(error.message);

        }

    }

}