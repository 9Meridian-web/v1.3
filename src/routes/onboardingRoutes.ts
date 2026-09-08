import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { OnboardingController } from "../controllers/onboardingController";
import { rateLimit } from "../middlewares/rateLimitMiddleware";
import { env } from "../config/env";

const router = Router();

router.post(
    "/complete",
    rateLimit({ windowMs: 60_000, max: env.RATE_LIMIT_MAX }),
    OnboardingController.complete,
);

router.get(
    "/status",
    (req, res, next) => {
        if (req.headers.authorization) {
            return authMiddleware(req, res, next);
        }
        return OnboardingController.status(req, res).catch(next);
    },
);

export default router;
