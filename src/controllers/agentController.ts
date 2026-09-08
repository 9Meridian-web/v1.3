import { Request, Response } from "express";
import { AgentService } from "../services/agents/agentService";
import { AppError } from "../errors/AppError";

export async function createAgent(req: Request, res: Response): Promise<void> {
    const agent = await AgentService.createAgent({
        ...req.body,
        client_id: req.user.clientId,
    });
    res.status(201).json({ success: true, message: "Agent created successfully.", data: agent });
}

export async function getAgentsByClient(req: Request, res: Response): Promise<void> {
    if (req.params.clientId !== req.user.clientId) throw new AppError("Forbidden.", 403);
    const agents = await AgentService.getAgentsByClient(req.user.clientId);
    res.status(200).json({ success: true, data: agents });
}

export async function publishAgent(req: Request, res: Response): Promise<void> {
    const agent = await AgentService.publishAgent(String(req.params.id), req.user.clientId);
    res.status(200).json({ success: true, message: "Agent published successfully.", data: agent });
}
