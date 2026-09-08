import { Router } from "express";

import { ClientController } from "../controllers/clientController";

import { ClientValidator } from "../services/validators/clientValidator";

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

    ClientController.delete

);

export default router;