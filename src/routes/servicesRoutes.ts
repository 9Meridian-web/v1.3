import { Router } from "express";

import { ServicesController } from "../controllers/servicesController";

import { ServicesValidator } from "../services/validators/servicesValidator";

import { authMiddleware } from "../middlewares/authMiddleware";

import { validationMiddleware } from "../middlewares/validationMiddleware";

import { requireOwnService } from "../middlewares/clientOwnershipMiddleware";

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
| Get All Services
|--------------------------------------------------------------------------
*/

router.get(

    "/",

    ServicesController.getAll

);

/*
|--------------------------------------------------------------------------
| Get Service By ID
|--------------------------------------------------------------------------
*/

router.get(

    "/:id",

    validationMiddleware(
        ServicesValidator.byId
    ),

    requireOwnService,

    ServicesController.get

);

/*
|--------------------------------------------------------------------------
| Create Service
|--------------------------------------------------------------------------
*/

router.post(

    "/",

    validationMiddleware(
        ServicesValidator.create
    ),

    ServicesController.create

);

/*
|--------------------------------------------------------------------------
| Update Service
|--------------------------------------------------------------------------
*/

router.put(

    "/:id",

    validationMiddleware(
        ServicesValidator.update
    ),

    requireOwnService,

    ServicesController.update

);

/*
|--------------------------------------------------------------------------
| Delete Service
|--------------------------------------------------------------------------
*/

router.delete(

    "/:id",

    validationMiddleware(
        ServicesValidator.byId
    ),

    requireOwnService,

    ServicesController.delete

);

export default router;