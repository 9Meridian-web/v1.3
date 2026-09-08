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
                await BookingService.create({

                    ...req.body,

                    client_id:
                        req.user.clientId

                });


            res.status(201).json({

                success: true,

                message:
                    "Booking created successfully.",

                data:
                    booking

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
                await BookingService.getForClient(

                    String(req.params.id),

                    req.user.clientId

                );


            res.status(200).json({

                success: true,

                data:
                    booking

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

            const bookings =
                await BookingService.getAll(

                    req.user.clientId

                );


            res.status(200).json({

                success: true,

                data:
                    bookings

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
                await BookingService.updateForClient(

                    String(req.params.id),

                    req.user.clientId,

                    req.body

                );


            res.status(200).json({

                success: true,

                message:
                    "Booking updated successfully.",

                data:
                    booking

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
                        String(req.params.id),

                    clientId:
                        req.user.clientId

                });


            res.status(200).json({

                success: true,

                message:
                    "Booking cancelled successfully.",

                data:
                    booking

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

            /*
            |--------------------------------------------------------------------------
            | Extract Request Data
            |--------------------------------------------------------------------------
            */

            const bookingId =
                String(req.params.id);


            const clientId =
                req.user.clientId;


            const appointmentDate =
                typeof req.body?.appointment_date === "string"
                    ? req.body.appointment_date.trim()
                    : "";


            const appointmentTime =
                typeof req.body?.appointment_time === "string"
                    ? req.body.appointment_time.trim()
                    : "";


            const serviceId =
                typeof req.body?.service_id === "string" &&
                req.body.service_id.trim().length > 0
                    ? req.body.service_id.trim()
                    : undefined;


            /*
            |--------------------------------------------------------------------------
            | Reschedule
            |--------------------------------------------------------------------------
            |
            | IMPORTANT:
            |
            | We intentionally do NOT catch errors here.
            |
            | RescheduleBookingService can throw:
            |
            | 400 → invalid request
            | 404 → booking not found
            | 409 → appointment slot conflict
            | 424 → Google connection problem
            |
            | asyncHandler passes those errors to the global error handler.
            |--------------------------------------------------------------------------
            */

            const booking =
                await RescheduleBookingService.reschedule({

                    bookingId,

                    clientId,

                    appointment_date:
                        appointmentDate,

                    appointment_time:
                        appointmentTime,

                    service_id:
                        serviceId

                });


            /*
            |--------------------------------------------------------------------------
            | Success
            |--------------------------------------------------------------------------
            */

            res.status(200).json({

                success: true,

                message:
                    "Booking rescheduled successfully.",

                data:
                    booking

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

            await BookingService.deleteForClient(

                String(req.params.id),

                req.user.clientId

            );


            res.status(200).json({

                success: true,

                message:
                    "Booking deleted successfully."

            });

        }

    );

}