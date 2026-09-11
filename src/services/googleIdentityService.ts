import { OAuth2Client } from "google-auth-library";

import { AppError } from "../errors/AppError";
import { env } from "../config/env";

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
  picture: string;
  exp: number;
}

/**
 * Verifies the Google Identity Services ID token submitted by the public
 * website. This is intentionally separate from the tenant Google Calendar
 * OAuth connection flow in googleService.
 */
export class GoogleIdentityService {
  private static readonly client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  static async verifyCredential(credential: unknown): Promise<GoogleIdentity> {
    if (typeof credential !== "string" || credential.length < 50) {
      throw new AppError("A valid Google credential is required.", 400);
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified || !payload.exp) {
        throw new AppError("Google did not return a verified email address.", 401);
      }

      return {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name ?? payload.email.split("@")[0],
        picture: payload.picture ?? "",
        exp: payload.exp,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Google sign-in could not be verified.", 401);
    }
  }
}
