import { Router } from "express";

import { GoogleController } from "../controllers/googleController";

import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Google OAuth
|--------------------------------------------------------------------------
*/

router.get(

    "/connect",

    authMiddleware,

    GoogleController.connect

);

router.get(

    "/callback",

    GoogleController.callback

);

/*
|--------------------------------------------------------------------------
| Connection Status
|--------------------------------------------------------------------------
*/

router.get(

    "/status",

    authMiddleware,

    GoogleController.status

);

/*
|--------------------------------------------------------------------------
| Disconnect
|--------------------------------------------------------------------------
*/

router.delete(

    "/disconnect",

    authMiddleware,

    GoogleController.disconnect

);

export default router;