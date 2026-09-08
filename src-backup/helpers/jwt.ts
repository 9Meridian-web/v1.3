import jwt, {
    Secret,
    SignOptions
} from "jsonwebtoken";

import { env } from "../config/env";

/*
|--------------------------------------------------------------------------
| JWT Payload
|--------------------------------------------------------------------------
*/

export interface JwtPayload {

    userId: string;

    clientId: string;

    role: string;

}

/*
|--------------------------------------------------------------------------
| JWT Helper
|--------------------------------------------------------------------------
*/

export class JwtHelper {

    /*
    |--------------------------------------------------------------------------
    | Generate Token
    |--------------------------------------------------------------------------
    */

    static generate(

        payload: JwtPayload

    ): string {

        const options: SignOptions = {};
        const jwtExpiresIn = env.JWT_EXPIRES_IN;

        if (jwtExpiresIn !== undefined) {

            options.expiresIn = jwtExpiresIn as NonNullable<SignOptions["expiresIn"]>;

        }

        return jwt.sign(

            payload,

            env.JWT_SECRET as Secret,

            options

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Verify Token
    |--------------------------------------------------------------------------
    */

    static verify(

        token: string

    ): JwtPayload {

        return jwt.verify(

            token,

            env.JWT_SECRET as Secret

        ) as JwtPayload;

    }

}