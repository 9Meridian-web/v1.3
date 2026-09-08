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

    validationMiddleware(
        BookingValidator.create
    ),

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

    validationMiddleware(
        BookingValidator.get
    ),

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

    validationMiddleware(
        BookingValidator.update
    ),

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

    validationMiddleware(
        BookingValidator.reschedule
    ),

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

    validationMiddleware(
        BookingValidator.cancel
    ),

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

    validationMiddleware(
        BookingValidator.delete
    ),

    BookingController.delete

);

export default router;