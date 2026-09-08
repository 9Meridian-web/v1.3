import { GOOGLE_SCOPES, createGoogleOAuthClient } from "./googleOAuth";

export { GOOGLE_SCOPES };

export function createOAuthClient() {
    return createGoogleOAuthClient();
}
