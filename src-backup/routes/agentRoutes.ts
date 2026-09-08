import { Router } from "express";

import {
    createAgent,
    getAgentsByClient
} from "../controllers/agentController";

const router = Router();

/*
|--------------------------------------------------------------------------
| Agent Routes
|--------------------------------------------------------------------------
*/

// Create Agent
router.post("/", createAgent);

// Get All Agents of One Client
router.get("/client/:clientId", getAgentsByClient);

export default router;