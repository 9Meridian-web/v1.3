import dotenv from "dotenv";

// Local `.env` settings should take precedence over a stale shell-level PORT
// (for example, a previous VS Code terminal session). Production continues to
// use deployment-provided environment variables.
dotenv.config({ override: process.env.NODE_ENV !== "production" });

function getEnv(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (!value || value.trim() === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value.trim();
}

function getCsvEnv(name: string, fallback: string): string[] {
    return getEnv(name, fallback)
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
}

const NODE_ENV = process.env.NODE_ENV ?? "development";

const dodoEnvironment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode";
if (dodoEnvironment !== "test_mode" && dodoEnvironment !== "live_mode") {
    throw new Error("DODO_PAYMENTS_ENVIRONMENT must be test_mode or live_mode.");
}

const dodoPaymentCurrency = (process.env.DODO_PAYMENT_CURRENCY ?? "USD").trim().toUpperCase();
if (!/^[A-Z]{3}$/.test(dodoPaymentCurrency)) {
    throw new Error("DODO_PAYMENT_CURRENCY must be a three-letter ISO currency code.");
}

function requireHttpsUrl(name: string): void {
    let url: URL;
    try {
        url = new URL(getEnv(name));
    } catch {
        throw new Error(`${name} must be a valid HTTPS URL in production.`);
    }
    if (url.protocol !== "https:") {
        throw new Error(`${name} must use HTTPS in production.`);
    }
}

if (NODE_ENV === "production") {
    if ((process.env.JWT_SECRET ?? "").length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
    if (!process.env.FRONTEND_URL?.startsWith("https://")) {
        throw new Error("FRONTEND_URL must use HTTPS in production.");
    }
    if (!process.env.GOOGLE_REDIRECT_URI?.startsWith("https://")) {
        throw new Error("GOOGLE_REDIRECT_URI must use HTTPS in production.");
    }
    if (!process.env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
        throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is required in production.");
    }
    if (!process.env.INTERNAL_WEBHOOK_SECRET) {
        throw new Error("INTERNAL_WEBHOOK_SECRET is required in production.");
    }
    if (!process.env.ONBOARDING_TOKEN_SECRET) {
        throw new Error("ONBOARDING_TOKEN_SECRET is required in production.");
    }
    if (!process.env.DODO_PAYMENTS_API_KEY || !process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
        throw new Error("Dodo Payments credentials are required in production.");
    }
    requireHttpsUrl("DODO_CHECKOUT_RETURN_URL");
    requireHttpsUrl("DODO_CHECKOUT_CANCEL_URL");

    const productNames = [
        "DODO_PRODUCT_SINGLE_BOT_SETUP",
        "DODO_PRODUCT_DUAL_BOT_PACK_SETUP",
        "DODO_PRODUCT_FULL_FRONT_LINE_SETUP",
        "DODO_PRODUCT_SINGLE_BOT_SUBSCRIPTION",
        "DODO_PRODUCT_DUAL_BOT_PACK_SUBSCRIPTION",
        "DODO_PRODUCT_FULL_FRONT_LINE_SUBSCRIPTION",
    ];
    for (const productName of productNames) {
        if (!(process.env[productName] ?? "").trim()) {
            throw new Error(`${productName} is required in production.`);
        }
    }
}

export const env = {
    PORT: Number(process.env.PORT ?? 8080),
    NODE_ENV,
    FRONTEND_URL: getEnv("FRONTEND_URL", "http://localhost:3000"),
    CORS_ORIGINS: getCsvEnv("CORS_ORIGINS", process.env.FRONTEND_URL ?? "http://localhost:3000"),

    SUPABASE_URL: getEnv("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"),

    JWT_SECRET: getEnv("JWT_SECRET"),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",

    GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
    GOOGLE_REDIRECT_URI: getEnv("GOOGLE_REDIRECT_URI"),
    GOOGLE_OAUTH_STATE_SECRET: getEnv("GOOGLE_OAUTH_STATE_SECRET", process.env.JWT_SECRET),

    GOOGLE_CALENDAR_DEFAULT: process.env.GOOGLE_CALENDAR_DEFAULT ?? "primary",
    GOOGLE_SHEETS_DEFAULT_NAME: process.env.GOOGLE_SHEETS_DEFAULT_NAME ?? "AI Receptionist Bookings",

    PUBLIC_AGENT_BASE_URL: getEnv("PUBLIC_AGENT_BASE_URL", `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/agent`),
    INTERNAL_WEBHOOK_SECRET: process.env.INTERNAL_WEBHOOK_SECRET ?? "",
    GOOGLE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "",
    ONBOARDING_TOKEN_SECRET: getEnv("ONBOARDING_TOKEN_SECRET", process.env.JWT_SECRET),

    DODO_PAYMENTS_API_KEY: getEnv("DODO_PAYMENTS_API_KEY", "development-placeholder"),
    DODO_PAYMENTS_WEBHOOK_KEY: getEnv("DODO_PAYMENTS_WEBHOOK_KEY", "development-webhook-placeholder"),
    DODO_PAYMENTS_ENVIRONMENT: dodoEnvironment,
    DODO_CHECKOUT_RETURN_URL: getEnv("DODO_CHECKOUT_RETURN_URL", `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/#payment`),
    DODO_CHECKOUT_CANCEL_URL: getEnv("DODO_CHECKOUT_CANCEL_URL", `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/#payment`),
    DODO_PAYMENT_CURRENCY: dodoPaymentCurrency,
    DODO_DEFAULT_PLAN: process.env.DODO_DEFAULT_PLAN ?? "Dual Bot Pack",
    DODO_PRODUCT_SINGLE_BOT_SETUP: process.env.DODO_PRODUCT_SINGLE_BOT_SETUP ?? "",
    DODO_PRODUCT_DUAL_BOT_PACK_SETUP: process.env.DODO_PRODUCT_DUAL_BOT_PACK_SETUP ?? "",
    DODO_PRODUCT_FULL_FRONT_LINE_SETUP: process.env.DODO_PRODUCT_FULL_FRONT_LINE_SETUP ?? "",
    DODO_PRODUCT_SINGLE_BOT_SUBSCRIPTION: process.env.DODO_PRODUCT_SINGLE_BOT_SUBSCRIPTION ?? "",
    DODO_PRODUCT_DUAL_BOT_PACK_SUBSCRIPTION: process.env.DODO_PRODUCT_DUAL_BOT_PACK_SUBSCRIPTION ?? "",
    DODO_PRODUCT_FULL_FRONT_LINE_SUBSCRIPTION: process.env.DODO_PRODUCT_FULL_FRONT_LINE_SUBSCRIPTION ?? "",

    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 120),
    AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
    PUBLIC_RATE_LIMIT_MAX: Number(process.env.PUBLIC_RATE_LIMIT_MAX ?? 30),
    PAYMENT_RATE_LIMIT_MAX: Number(process.env.PAYMENT_RATE_LIMIT_MAX ?? 20),
} as const;
