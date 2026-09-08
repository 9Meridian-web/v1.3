import { Request, Response } from "express";
import { GoogleService } from "../services/google/googleService";
import { AppError } from "../errors/AppError";
import { verifyGoogleOAuthState } from "../config/googleOAuth";
import { env } from "../config/env";
import { verifySetupToken } from "../helpers/setupToken";

function getSetupClientId(req: Request): string | null {
    const queryToken = typeof req.query.setup_token === "string" ? req.query.setup_token : "";
    if (!queryToken) return null;
    try {
        return verifySetupToken(queryToken).clientId;
    } catch {
        throw new AppError("Invalid or expired onboarding token.", 401);
    }
}

export class GoogleController {
    static async connect(req: Request, res: Response): Promise<void> {
        const setupClientId = getSetupClientId(req);
        const clientId = setupClientId ?? req.user?.clientId;

        if (!clientId) {
            throw new AppError("Authorization or setup_token is required.", 401);
        }

        const userId = req.user?.userId ?? `onboarding:${clientId}`;
        const url = GoogleService.getConnectUrl(userId, clientId);

        res.status(200).json({
            success: true,
            message: "Google authorization URL generated successfully.",
            data: { authorization_url: url },
        });
    }

    static async callback(req: Request, res: Response): Promise<void> {
        const code = typeof req.query.code === "string" ? req.query.code : "";
        const state = typeof req.query.state === "string" ? req.query.state : "";
        const error = typeof req.query.error === "string" ? req.query.error : "";

        if (error === "access_denied") {
            res.redirect(`${env.FRONTEND_URL}/#setup-form?google=denied`);
            return;
        }
        if (!code || !state) throw new AppError("Invalid Google OAuth callback.", 400);

        let verified: { userId: string; clientId: string };
        try {
            verified = verifyGoogleOAuthState(state);
        } catch {
            throw new AppError("Invalid or expired Google OAuth state.", 400);
        }

        await GoogleService.handleCallback(code, verified.clientId);
        res.redirect(`${env.FRONTEND_URL}/#setup-form?google=connected`);
    }

    static async status(req: Request, res: Response): Promise<void> {
        const setupClientId = getSetupClientId(req);
        const clientId = setupClientId ?? req.user?.clientId;
        if (!clientId) throw new AppError("Authorization or setup_token is required.", 401);
        const status = await GoogleService.getStatus(clientId);
        res.status(200).json({ success: true, data: status });
    }

    static async disconnect(req: Request, res: Response): Promise<void> {
        await GoogleService.disconnect(req.user.clientId);
        res.status(200).json({ success: true, message: "Google account disconnected successfully." });
    }
}
