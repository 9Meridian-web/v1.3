import { Router } from "express";

import { AuthController } from "../controllers/authController";

import { AuthValidator } from "../services/validators/authValidator";

import { validationMiddleware } from "../middlewares/validationMiddleware";

import { authMiddleware } from "../middlewares/authMiddleware";
import { rateLimit } from "../middlewares/rateLimitMiddleware";
import { env } from "../config/env";

const router = Router();

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/

router.post(

    "/register",

    rateLimit({ windowMs: 15 * 60 * 1000, max: env.AUTH_RATE_LIMIT_MAX }),

    validationMiddleware(

        AuthValidator.register

    ),

    AuthController.register

);

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

router.post(

    "/login",

    rateLimit({ windowMs: 15 * 60 * 1000, max: env.AUTH_RATE_LIMIT_MAX }),

    validationMiddleware(

        AuthValidator.login

    ),

    AuthController.login

);

/*
|--------------------------------------------------------------------------
| Current User
|--------------------------------------------------------------------------
*/

router.get(

    "/me",

    authMiddleware,

    AuthController.getCurrentUser

);

export default router;