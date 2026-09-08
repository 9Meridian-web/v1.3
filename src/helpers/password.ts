import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export class PasswordHelper {

    /*
    |--------------------------------------------------------------------------
    | Hash Password
    |--------------------------------------------------------------------------
    */

    static async hash(

        password: string

    ): Promise<string> {

        return await bcrypt.hash(

            password,

            SALT_ROUNDS

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Compare Password
    |--------------------------------------------------------------------------
    */

    static async compare(

        password: string,

        hash: string

    ): Promise<boolean> {

        return await bcrypt.compare(

            password,

            hash

        );

    }

}