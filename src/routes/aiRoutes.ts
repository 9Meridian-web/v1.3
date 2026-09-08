import { Router } from "express";

import { AIController } from "../controllers/aiController";

import { authMiddleware } from "../middlewares/authMiddleware";
import { rateLimit } from "../middlewares/rateLimitMiddleware";
import { env } from "../config/env";

const router = Router();

/*
|--------------------------------------------------------------------------
| AI Chat
|--------------------------------------------------------------------------
*/

router.post(

    "/chat",

    rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX }),

    authMiddleware,

    AIController.chat

);

export default router;