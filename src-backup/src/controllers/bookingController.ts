import { Request, Response } from "express";

import { BookingService } from "../services/booking/bookingService";
import {
    CancelBookingService
} from "../services/booking/cancelBookingService";
import {
    RescheduleBookingService
} from "../services/booking/rescheduleBookingService";

import { asyncHandler } from "../middlewares/asyncHandler";

export class BookingController {

    /*
    |--------------------------------------------------------------------------
    | Create Booking
    |--------------------------------------------------------------------------
    */

    static create = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const booking =

                await BookingService.create(

                    req.body

                );

            res.status(201).json({

                success: true,

                message:

                    "Booking created successfully.",

                data: booking

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Get Booking
    |--------------------------------------------------------------------------
    */

    static get = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const booking =

                await BookingService.get(

                    String(req.params.id)

                );

            res.status(200).json({

                success: true,

                data: booking

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Get Client Bookings
    |--------------------------------------------------------------------------
    */

    static getAll = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const clientId =

                String(req.params.clientId);

            const bookings =

                await BookingService.getAll(

                    clientId

                );

            res.status(200).json({

                success: true,

                data: bookings

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Update Booking
    |--------------------------------------------------------------------------
    */

    static update = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const booking =

                await BookingService.update(

                    String(req.params.id),

                    req.body

                );

            res.status(200).json({

                success: true,

                message:

                    "Booking updated successfully.",

                data: booking

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Cancel Booking
    |--------------------------------------------------------------------------
    */

    static cancel = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const booking =

                await CancelBookingService.cancel({

                    bookingId:

                        String(req.params.id)

                });

            res.status(200).json({

                success: true,

                message:

                    "Booking cancelled successfully.",

                data: booking

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Reschedule Booking
    |--------------------------------------------------------------------------
    */

    static reschedule = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const booking =

                await RescheduleBookingService.reschedule({

                    bookingId:

                        String(req.params.id),

                    appointment_date:

                        req.body.appointment_date,

                    appointment_time:

                        req.body.appointment_time,

                    service_id:

                        req.body.service_id

                });

            res.status(200).json({

                success: true,

                message:

                    "Booking rescheduled successfully.",

                data: booking

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Delete Booking
    |--------------------------------------------------------------------------
    */

    static delete = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            await BookingService.delete(

                String(req.params.id)

            );

            res.status(200).json({

                success: true,

                message:

                    "Booking deleted successfully."

            });

        }

    );

}