import { supabase } from "../config/supabase";

import { AppError } from "../errors/AppError";

import { User } from "../types/user";

export class AuthRepository {

    /*
    |--------------------------------------------------------------------------
    | Create User
    |--------------------------------------------------------------------------
    */

    static async create(

        user: User

    ): Promise<User> {

        const {

            data,

            error

        } = await supabase

            .from("users")

            .insert(user)

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
    | Find User By Email
    |--------------------------------------------------------------------------
    */

    static async findByEmail(

        email: string

    ): Promise<User | null> {

        const {

            data,

            error

        } = await supabase

            .from("users")

            .select("*")

            .eq("email", email)

            .maybeSingle();

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
    | Find User By ID
    |--------------------------------------------------------------------------
    */

    static async findById(

        id: string

    ): Promise<User | null> {

        const {

            data,

            error

        } = await supabase

            .from("users")

            .select("*")

            .eq("id", id)

            .maybeSingle();

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

        return data;

    }

}