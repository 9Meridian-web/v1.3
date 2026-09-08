import { Router } from "express";
import { InternalController } from "../controllers/internalController";
import { internalWebhookMiddleware } from "../middlewares/internalWebhookMiddleware";
import { rateLimit } from "../middlewares/rateLimitMiddleware";
import { env } from "../config/env";

const router = Router();
router.use(internalWebhookMiddleware);
router.use(rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: 60 }));
router.post("/payments/confirmed", InternalController.paymentConfirmed);
export default router;
