import { Router } from "express";
import { DodoPaymentsController } from "../controllers/dodoPaymentsController";
import { env } from "../config/env";
import { rateLimit } from "../middlewares/rateLimitMiddleware";

const router = Router();

router.use(rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.PAYMENT_RATE_LIMIT_MAX }));

router.post("/checkout", DodoPaymentsController.createCheckout);
router.post("/subscriptions/checkout", DodoPaymentsController.createSubscriptionCheckout);
router.get("/status/:sessionId", DodoPaymentsController.status);

export default router;
