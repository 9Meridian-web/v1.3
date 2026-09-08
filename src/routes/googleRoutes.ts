import { Router } from "express";
import { GoogleController } from "../controllers/googleController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// /connect and /status accept either a normal owner JWT or a short-lived
// onboarding setup_token. This lets a newly paid client connect Google before
// creating a full owner login.
router.get("/connect", (req, res, next) => {
    if (req.headers.authorization) return authMiddleware(req, res, next);
    return GoogleController.connect(req, res).catch(next);
});

router.get("/callback", GoogleController.callback);

router.get("/status", (req, res, next) => {
    if (req.headers.authorization) return authMiddleware(req, res, next);
    return GoogleController.status(req, res).catch(next);
});

router.delete("/disconnect", authMiddleware, GoogleController.disconnect);

export default router;
