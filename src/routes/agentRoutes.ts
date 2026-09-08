import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validationMiddleware } from "../middlewares/validationMiddleware";
import { createAgent, getAgentsByClient, publishAgent } from "../controllers/agentController";
import { AgentValidator } from "../services/validators/agentValidator";
import { requireOwnAgent } from "../middlewares/clientOwnershipMiddleware";
import { AppError } from "../errors/AppError";

const router = Router();
router.use(authMiddleware);
router.post("/", validationMiddleware(AgentValidator.create), createAgent);
router.get("/client/:clientId", (req, res, next) => {
    if (req.params.clientId !== req.user.clientId) {
        next(new AppError("Forbidden.", 403));
        return;
    }
    getAgentsByClient(req, res);
});
router.post("/:id/publish", validationMiddleware(AgentValidator.byId), requireOwnAgent, publishAgent);

export default router;
