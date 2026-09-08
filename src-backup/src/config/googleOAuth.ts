import { google } from "googleapis";
import { env } from "./env";

export const googleOAuthClient = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
);

export const GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",

    "https://www.googleapis.com/auth/calendar",

    "https://www.googleapis.com/auth/spreadsheets"
];

export function getGoogleAuthUrl(
    clientId: string
): string {

    return googleOAuthClient.generateAuthUrl({

        access_type: "offline",

        prompt: "consent",

        scope: GOOGLE_SCOPES,

        state: clientId

    });

}