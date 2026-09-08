import { AppError } from "../../errors/AppError";
import { Agent } from "../../types/agent";
import { AgentRepository } from "../../repositories/agentRepository";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env";
import { supabase } from "../../config/supabase";
import { GoogleService } from "../google/googleService";
import { ServiceService } from "../serviceService";
import { BusinessSettingsService } from "../business/businessSettingsService";

function slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "agent";
}

export class AgentService {
    static async createAgent(agentData: Agent): Promise<Agent> {
        const slug = `${slugify(agentData.business_name)}-${randomBytes(4).toString("hex")}`;
        const agent = await AgentRepository.create({
            ...agentData,
            status: "draft",
            public_slug: slug,
            booking_enabled: agentData.booking_enabled ?? true,
            language: agentData.language ?? "en",
            timezone: agentData.timezone ?? "UTC",
            voice_provider: agentData.voice_provider ?? "none",
        } as Agent);
        await supabase.from("clients").update({
            onboarding_status: "agent_created",
            updated_at: new Date().toISOString(),
        }).eq("id", agentData.client_id);
        return agent;
    }

    static async getAgentsByClient(clientId: string): Promise<Agent[]> {
        return AgentRepository.listByClient(clientId);
    }

    static async publishAgent(id: string, clientId: string): Promise<Agent> {
        const googleConnected = await GoogleService.isConnected(clientId);
        if (!googleConnected) throw new AppError("Connect the Google account before publishing the agent.", 400);

        const services = await ServiceService.getAll(clientId);
        if (services.length === 0) throw new AppError("Add at least one service before publishing the agent.", 400);

        try {
            await BusinessSettingsService.get(clientId);
        } catch {
            throw new AppError("Complete business settings before publishing the agent.", 400);
        }

        const agent = await AgentRepository.publish(id, clientId);
        await supabase.from("clients").update({
            onboarding_status: "published",
            public_agent_slug: agent.public_slug,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq("id", clientId);
        return {
            ...agent,
            public_url: `${env.PUBLIC_AGENT_BASE_URL.replace(/\/$/, "")}/${agent.public_slug}`,
        } as Agent;
    }
}
