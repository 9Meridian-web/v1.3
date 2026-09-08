import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { ClientService } from "../services/clients/clientService";
import { GoogleService } from "../services/google/googleService";
import { ServiceService } from "../services/serviceService";
import { BusinessSettingsService } from "../services/business/businessSettingsService";
import { AgentService } from "../services/agents/agentService";
import { OnboardingService } from "../services/onboardingService";
import { verifySetupToken } from "../helpers/setupToken";

export class OnboardingController {
    static async complete(req: Request, res: Response): Promise<void> {
        const result = await OnboardingService.complete(req.body);
        res.status(200).json({
            success: true,
            message: "Onboarding saved successfully.",
            data: result,
        });
    }

    static async status(req: Request, res: Response): Promise<void> {
        let clientId = req.user?.clientId;

        if (!clientId) {
            const token = typeof req.query.setup_token === "string" ? req.query.setup_token : "";
            if (!token) throw new AppError("Authorization or setup_token is required.", 401);
            try {
                clientId = verifySetupToken(token).clientId;
            } catch {
                throw new AppError("Invalid or expired onboarding token.", 401);
            }
        }

        const client = await ClientService.get(clientId);
        const googleConnected = await GoogleService.isConnected(clientId);
        const services = await ServiceService.getAll(clientId);
        let businessSettingsComplete = false;
        try {
            const settings = await BusinessSettingsService.get(clientId);
            businessSettingsComplete = Boolean(settings?.business_name && settings?.opening_time && settings?.closing_time);
        } catch { /* not configured yet */ }
        const agents = await AgentService.getAgentsByClient(clientId);

        res.status(200).json({
            success: true,
            data: {
                client_id: clientId,
                payment_status: client.payment_status ?? "pending",
                onboarding_status: client.onboarding_status ?? "onboarding",
                business_profile_complete: Boolean(client.business_name && client.owner_name && client.email && client.timezone),
                business_settings_complete: businessSettingsComplete,
                services_complete: services.length > 0,
                google_connected: googleConnected,
                agent: agents[0] ?? null,
                ready_to_publish: googleConnected && services.length > 0 && businessSettingsComplete,
            },
        });
    }
}
