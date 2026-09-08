import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { env } from "./env";

export const GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.freebusy",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
];

export function createGoogleOAuthClient() {
    return new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI,
    );
}

export function getGoogleAuthUrl(userId: string, clientId: string): string {
    const state = jwt.sign(
        { sub: userId, clientId, purpose: "google_oauth" },
        env.GOOGLE_OAUTH_STATE_SECRET,
        { expiresIn: "10m", issuer: "ai-receptionist", audience: "google-oauth" },
    );

    return createGoogleOAuthClient().generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: GOOGLE_SCOPES,
        state,
        include_granted_scopes: true,
    });
}

export function verifyGoogleOAuthState(state: string): { userId: string; clientId: string } {
    const payload = jwt.verify(
        state,
        env.GOOGLE_OAUTH_STATE_SECRET,
        { issuer: "ai-receptionist", audience: "google-oauth" },
    ) as jwt.JwtPayload;

    if (payload.purpose !== "google_oauth" || typeof payload.sub !== "string" || typeof payload.clientId !== "string") {
        throw new Error("Invalid Google OAuth state.");
    }

    return { userId: payload.sub, clientId: payload.clientId };
}
