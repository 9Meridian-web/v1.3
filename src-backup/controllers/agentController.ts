import { Request, Response } from "express";
import { AgentService } from "../services/agents/agentService";
import { Agent } from "../types/agent";

/*
|--------------------------------------------------------------------------
| Create Agent
|--------------------------------------------------------------------------
*/

export const createAgent = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const agentData: Agent = req.body;

        const agent = await AgentService.createAgent(agentData);

        res.status(201).json({
            success: true,
            message: "Agent Created Successfully",
            agent
        });

    } catch (error: any) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

/*
|--------------------------------------------------------------------------
| Get Agents By Client
|--------------------------------------------------------------------------
*/

export const getAgentsByClient = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

       const clientId = req.params.clientId as string;

const agents = await AgentService.getAgentsByClient(clientId);
        res.status(200).json({
            success: true,
            count: agents.length,
            agents
        });

    } catch (error: any) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};