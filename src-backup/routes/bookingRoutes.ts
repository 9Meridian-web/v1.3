import { Router } from "express";

import { BookingController } from "../controllers/bookingController";

import { BookingValidator } from "../services/validators/bookingValidator";

import { validationMiddleware } from "../middlewares/validationMiddleware";

import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Create Booking
|--------------------------------------------------------------------------
*/

router.post(

    "/",

    authMiddleware,

    BookingValidator.create,

    validationMiddleware,

    BookingController.create

);

/*
|--------------------------------------------------------------------------
| Get Client Bookings
|--------------------------------------------------------------------------
*/

router.get(

    "/client/:clientId",

    authMiddleware,

    BookingController.getAll

);

/*
|--------------------------------------------------------------------------
| Get Booking
|--------------------------------------------------------------------------
*/

router.get(

    "/:id",

    authMiddleware,

    BookingValidator.get,

    validationMiddleware,

    BookingController.get

);

/*
|--------------------------------------------------------------------------
| Update Booking
|--------------------------------------------------------------------------
*/

router.put(

    "/:id",

    authMiddleware,

    BookingValidator.update,

    validationMiddleware,

    BookingController.update

);

/*
|--------------------------------------------------------------------------
| Reschedule Booking
|--------------------------------------------------------------------------
*/

router.put(

    "/:id/reschedule",

    authMiddleware,

    BookingValidator.reschedule,

    validationMiddleware,

    BookingController.reschedule

);

/*
|--------------------------------------------------------------------------
| Cancel Booking
|--------------------------------------------------------------------------
*/

router.put(

    "/:id/cancel",

    authMiddleware,

    BookingValidator.cancel,

    validationMiddleware,

    BookingController.cancel

);

/*
|--------------------------------------------------------------------------
| Delete Booking
|--------------------------------------------------------------------------
*/

router.delete(

    "/:id",

    authMiddleware,

    BookingValidator.delete,

    validationMiddleware,

    BookingController.delete

);

export default router;