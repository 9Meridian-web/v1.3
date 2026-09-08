import { AppError } from "../errors/AppError";

import { JwtHelper } from "../helpers/jwt";
import { PasswordHelper } from "../helpers/password";

import { AuthRepository } from "../repositories/authRepository";

import { User } from "../types/user";

interface RegisterRequest {

    client_id: string;

    name: string;

    email: string;

    password: string;

    role?: string;

}

interface LoginRequest {

    email: string;

    password: string;

}

interface AuthResponse {

    user: Omit<User, "password_hash">;

    token: string;

}

export class AuthService {

    /*
    |--------------------------------------------------------------------------
    | Register
    |--------------------------------------------------------------------------
    */

    static async register(

        request: RegisterRequest

    ): Promise<AuthResponse> {

        const existingUser = await AuthRepository.findByEmail(

            request.email

        );

        if (existingUser) {

            throw new AppError(

                "Email already exists.",

                409

            );

        }

        const passwordHash = await PasswordHelper.hash(

            request.password

        );

        const createdUser = await AuthRepository.create({

            client_id: request.client_id,

            name: request.name,

            email: request.email,

            password_hash: passwordHash,

            role: request.role ?? "Owner"

        });

        const token = JwtHelper.generate({

            userId: createdUser.id!,

            clientId: createdUser.client_id,

            role: createdUser.role

        });

        const {

            password_hash,

            ...safeUser

        } = createdUser;

        return {

            user: safeUser,

            token

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Login
    |--------------------------------------------------------------------------
    */

    static async login(

        request: LoginRequest

    ): Promise<AuthResponse> {

        const user = await AuthRepository.findByEmail(

            request.email

        );

        if (!user) {

            throw new AppError(

                "Invalid email or password.",

                401

            );

        }

        const passwordMatches = await PasswordHelper.compare(

            request.password,

            user.password_hash

        );

        if (!passwordMatches) {

            throw new AppError(

                "Invalid email or password.",

                401

            );

        }

        const token = JwtHelper.generate({

            userId: user.id!,

            clientId: user.client_id,

            role: user.role

        });

        const {

            password_hash,

            ...safeUser

        } = user;

        return {

            user: safeUser,

            token

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Get Current User
    |--------------------------------------------------------------------------
    */

    static async getCurrentUser(

        userId: string

    ): Promise<Omit<User, "password_hash">> {

        const user = await AuthRepository.findById(

            userId

        );

        if (!user) {

            throw new AppError(

                "User not found.",

                404

            );

        }

        const {

            password_hash,

            ...safeUser

        } = user;

        return safeUser;

    }

}