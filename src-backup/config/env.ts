import dotenv from "dotenv";

dotenv.config();

/*
|--------------------------------------------------------------------------
| Environment Helper
|--------------------------------------------------------------------------
*/

function getEnv(name: string): string {

    const value = process.env[name];

    if (!value || value.trim() === "") {

        throw new Error(
            `Missing required environment variable: ${name}`
        );

    }

    return value;

}

/*
|--------------------------------------------------------------------------
| Environment Variables
|--------------------------------------------------------------------------
*/

export const env = {

    /*
    |--------------------------------------------------------------------------
    | Application
    |--------------------------------------------------------------------------
    */

    PORT: Number(process.env.PORT ?? 8080),

    NODE_ENV: process.env.NODE_ENV ?? "development",

    FRONTEND_URL:
        process.env.FRONTEND_URL ??
        "http://localhost:3000",

    /*
    |--------------------------------------------------------------------------
    | Supabase
    |--------------------------------------------------------------------------
    */

    SUPABASE_URL: getEnv(
        "SUPABASE_URL"
    ),

    SUPABASE_SERVICE_ROLE_KEY: getEnv(
        "SUPABASE_SERVICE_ROLE_KEY"
    ),

    /*
    |--------------------------------------------------------------------------
    | JWT
    |--------------------------------------------------------------------------
    */

    JWT_SECRET: getEnv(
        "JWT_SECRET"
    ),

    JWT_EXPIRES_IN:
        process.env.JWT_EXPIRES_IN ??
        "7d",

    /*
    |--------------------------------------------------------------------------
    | Google OAuth
    |--------------------------------------------------------------------------
    */

    GOOGLE_CLIENT_ID: getEnv(
        "GOOGLE_CLIENT_ID"
    ),

    GOOGLE_CLIENT_SECRET: getEnv(
        "GOOGLE_CLIENT_SECRET"
    ),

    GOOGLE_REDIRECT_URI: getEnv(
        "GOOGLE_REDIRECT_URI"
    ),

    /*
    |--------------------------------------------------------------------------
    | Google APIs
    |--------------------------------------------------------------------------
    */

    GOOGLE_CALENDAR_DEFAULT:
        process.env.GOOGLE_CALENDAR_DEFAULT ??
        "primary",

    GOOGLE_SHEETS_DEFAULT_NAME:
        process.env.GOOGLE_SHEETS_DEFAULT_NAME ??
        "AI Receptionist Bookings"

} as const;