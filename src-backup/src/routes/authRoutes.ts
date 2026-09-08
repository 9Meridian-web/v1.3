import { Router } from "express";

import { AuthController } from "../controllers/authController";

import { AuthValidator } from "../services/validators/authValidator";

import { validationMiddleware } from "../middlewares/validationMiddleware";

import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/

router.post(

    "/register",

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