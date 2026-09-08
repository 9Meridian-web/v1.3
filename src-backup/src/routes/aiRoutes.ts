import { Router } from "express";

import { AIController } from "../controllers/aiController";

import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| AI Chat
|--------------------------------------------------------------------------
*/

router.post(

    "/chat",

    authMiddleware,

    AIController.chat

);

export default router;