import { Router } from "express";

import { ServicesController } from "../controllers/servicesController";

import { ServicesValidator } from "../services/validators/servicesValidator";

import { authMiddleware } from "../middlewares/authMiddleware";

import { validationMiddleware } from "../middlewares/validationMiddleware";

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

    ServicesValidator.byId,

    validationMiddleware,

    ServicesController.get

);

/*
|--------------------------------------------------------------------------
| Create Service
|--------------------------------------------------------------------------
*/

router.post(

    "/",

    ServicesValidator.create,

    validationMiddleware,

    ServicesController.create

);

/*
|--------------------------------------------------------------------------
| Update Service
|--------------------------------------------------------------------------
*/

router.put(

    "/:id",

    ServicesValidator.update,

    validationMiddleware,

    ServicesController.update

);

/*
|--------------------------------------------------------------------------
| Delete Service
|--------------------------------------------------------------------------
*/

router.delete(

    "/:id",

    ServicesValidator.byId,

    validationMiddleware,

    ServicesController.delete

);

export default router;