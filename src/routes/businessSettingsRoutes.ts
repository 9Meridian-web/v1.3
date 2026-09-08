import { Router } from "express";

import { BusinessSettingsController } from "../controllers/businessSettingsController";

import { BusinessSettingsValidator } from "../services/validators/businessSettingsValidator";

import { validationMiddleware } from "../middlewares/validationMiddleware";

import { authMiddleware } from "../middlewares/authMiddleware";
import { requireOwnClientParam } from "../middlewares/clientOwnershipMiddleware";

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

    requireOwnClientParam("clientId"),

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

    requireOwnClientParam("clientId"),

    BusinessSettingsController.update

);

export default router;