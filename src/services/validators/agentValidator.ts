import { body, param } from "express-validator";

export class AgentValidator {
    static create = [
        body("agent_name").trim().notEmpty().isLength({ min: 2, max: 100 }),
        body("business_name").trim().notEmpty().isLength({ min: 2, max: 120 }),
        body("prompt").optional().isString().isLength({ max: 10000 }),
        body("language").optional().trim().isLength({ min: 2, max: 20 }),
        body("timezone").optional().trim().isLength({ min: 1, max: 100 }),
        body("voice_provider").optional().trim().isLength({ max: 100 }),
        body("voice_id").optional().trim().isLength({ max: 200 }),
        body("booking_enabled").optional().isBoolean(),
    ];
    static byId = [param("id").isUUID().withMessage("Agent ID must be a valid UUID.")];
}
