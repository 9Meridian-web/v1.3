import { Router } from "express";

import { ClientController } from "../controllers/clientController";

import { ClientValidator } from "../services/validators/clientValidator";

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
| Create Client
|--------------------------------------------------------------------------
*/

router.post(

    "/",

    validationMiddleware(

        ClientValidator.create

    ),

    ClientController.create

);

/*
|--------------------------------------------------------------------------
| Get All Clients
|--------------------------------------------------------------------------
*/

router.get(

    "/",

    ClientController.getAll

);

/*
|--------------------------------------------------------------------------
| Get Client
|--------------------------------------------------------------------------
*/

router.get(

    "/:id",

    validationMiddleware(

        ClientValidator.get

    ),

    requireOwnClientParam("id"),

    ClientController.get

);

/*
|--------------------------------------------------------------------------
| Update Client
|--------------------------------------------------------------------------
*/

router.put(

    "/:id",

    validationMiddleware(

        ClientValidator.update

    ),

    requireOwnClientParam("id"),

    ClientController.update

);

/*
|--------------------------------------------------------------------------
| Delete Client
|--------------------------------------------------------------------------
*/

router.delete(

    "/:id",

    validationMiddleware(

        ClientValidator.delete

    ),

    requireOwnClientParam("id"),

    ClientController.delete

);

export default router;