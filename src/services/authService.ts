import { AppError } from "../errors/AppError";

import { JwtHelper } from "../helpers/jwt";
import { PasswordHelper } from "../helpers/password";

import { AuthRepository } from "../repositories/authRepository";
import { ClientRepository } from "../repositories/clientRepository";
import { verifySetupToken } from "../helpers/setupToken";

import { User } from "../types/user";

interface RegisterRequest {

    setup_token: string;

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

        let setup;
        try {
            setup = verifySetupToken(request.setup_token);
        } catch {
            throw new AppError("Invalid or expired onboarding token.", 401);
        }

        const client = await ClientRepository.get(setup.clientId);

        if (!client.is_active) {
            throw new AppError("Client account is not active.", 403);
        }

        const existingUser = await AuthRepository.findByEmail(
            request.email.toLowerCase()
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

            client_id: setup.clientId,

            name: request.name,

            email: request.email.toLowerCase(),

            password_hash: passwordHash,

            role: "Owner"

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