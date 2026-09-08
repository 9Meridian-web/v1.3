import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface SetupPayload {
    clientId: string;
    purpose: "onboarding";
}

export function createSetupToken(clientId: string): string {
    return jwt.sign(
        { clientId, purpose: "onboarding" },
        env.ONBOARDING_TOKEN_SECRET,
        { expiresIn: "24h", issuer: "ai-receptionist", audience: "onboarding" }
    );
}

export function verifySetupToken(token: string): SetupPayload {
    const payload = jwt.verify(
        token,
        env.ONBOARDING_TOKEN_SECRET,
        { issuer: "ai-receptionist", audience: "onboarding" }
    ) as jwt.JwtPayload;

    if (payload.purpose !== "onboarding" || typeof payload.clientId !== "string") {
        throw new Error("Invalid onboarding token.");
    }

    return { clientId: payload.clientId, purpose: "onboarding" };
}
