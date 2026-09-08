import { Router } from "express";

import { BusinessSettingsController } from "../controllers/businessSettingsController";

import { BusinessSettingsValidator } from "../services/validators/businessSettingsValidator";

import { validationMiddleware } from "../middlewares/validationMiddleware";

import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(

    authMiddleware

);

/*
|--------------------------------------------------------------------------
| Create
|--------------------------------------------------------------------------
*/

router.post(

    "/",

    validationMiddleware(

        BusinessSettingsValidator.create

    ),

    BusinessSettingsController.create

);

/*
|--------------------------------------------------------------------------
| Get
|--------------------------------------------------------------------------
*/

router.get(

    "/:clientId",

    validationMiddleware(

        BusinessSettingsValidator.get

    ),

    BusinessSettingsController.get

);

/*
|--------------------------------------------------------------------------
| Update
|--------------------------------------------------------------------------
*/

router.put(

    "/:clientId",

    validationMiddleware(

        BusinessSettingsValidator.update

    ),

    BusinessSettingsController.update

);

export default router;