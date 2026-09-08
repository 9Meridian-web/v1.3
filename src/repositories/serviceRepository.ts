import { supabase } from "../config/supabase";

import { AppError } from "../errors/AppError";

import { Service } from "../types/service";

export class ServiceRepository {

    /*
    |--------------------------------------------------------------------------
    | Create
    |--------------------------------------------------------------------------
    */

    static async create(

        service: Service

    ): Promise<Service> {

        const { data, error } = await supabase

            .from("services")

            .insert(service)

            .select()

            .single();

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Get By ID
    |--------------------------------------------------------------------------
    */

    static async get(

        id: string

    ): Promise<Service> {

        const { data, error } = await supabase

            .from("services")

            .select("*")

            .eq("id", id)

            .single();

        if (error || !data) {

            throw new AppError(

                "Service not found.",

                404

            );

        }

        return data;

    }


    static async getForClient(

        id: string,

        clientId: string

    ): Promise<Service> {

        const { data, error } = await supabase

            .from("services")

            .select("*")

            .eq("id", id)

            .eq("client_id", clientId)

            .maybeSingle();

        if (error || !data) {

            throw new AppError(

                "Service not found.",

                404

            );

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Get All
    |--------------------------------------------------------------------------
    */

    static async getAll(

        clientId: string

    ): Promise<Service[]> {

        const { data, error } = await supabase

            .from("services")

            .select("*")

            .eq("client_id", clientId)

            .order("name");

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

        return data ?? [];

    }

    /*
    |--------------------------------------------------------------------------
    | Get Active
    |--------------------------------------------------------------------------
    */

    static async getActive(

        clientId: string

    ): Promise<Service[]> {

        const { data, error } = await supabase

            .from("services")

            .select("*")

            .eq("client_id", clientId)

            .eq("is_active", true)

            .order("name");

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

        return data ?? [];

    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    static async search(

        clientId: string,

        keyword: string

    ): Promise<Service[]> {

        const { data, error } = await supabase

            .from("services")

            .select("*")

            .eq("client_id", clientId)

            .ilike("name", `%${keyword}%`);

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

        return data ?? [];

    }

    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    */

    static async update(

        id: string,

        updates: Partial<Service>

    ): Promise<Service> {

        const { data, error } = await supabase

            .from("services")

            .update(updates)

            .eq("id", id)

            .select()

            .single();

        if (error || !data) {

            throw new AppError(

                "Unable to update service.",

                500

            );

        }

        return data;

    }


    static async updateForClient(

        id: string,

        clientId: string,

        updates: Partial<Service>

    ): Promise<Service> {

        const { data, error } = await supabase

            .from("services")

            .update(updates)

            .eq("id", id)

            .eq("client_id", clientId)

            .select()

            .maybeSingle();

        if (error || !data) {

            throw new AppError(

                "Service not found.",

                404

            );

        }

        return data;

    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete
    |--------------------------------------------------------------------------
    */


    static async deleteForClient(

        id: string,

        clientId: string

    ): Promise<void> {

        const { data, error } = await supabase

            .from("services")

            .update({

                is_active: false

            })

            .eq("id", id)

            .eq("client_id", clientId)

            .select("id")

            .maybeSingle();

        if (error || !data) {

            throw new AppError(

                "Service not found.",

                404

            );

        }

    }

    static async delete(

        id: string

    ): Promise<void> {

        const { error } = await supabase

            .from("services")

            .update({

                is_active: false

            })

            .eq("id", id);

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

    }

}