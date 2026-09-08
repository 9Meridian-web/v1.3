import { Request, Response } from "express";

import { asyncHandler } from "../middlewares/asyncHandler";

import { RequestHelper } from "../helpers/requestHelper";

import { ServiceService } from "../services/serviceService";

import { Service } from "../types/service";

export class ServicesController {

    /*
    |--------------------------------------------------------------------------
    | Get All Services
    |--------------------------------------------------------------------------
    */

    static getAll = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const clientId =

                RequestHelper.clientId(

                    req

                );

            const services =

                await ServiceService.getAll(

                    clientId

                );

            res.status(200).json({

                success: true,

                data: services

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Get Active Services
    |--------------------------------------------------------------------------
    */

    static getActive = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const clientId =

                RequestHelper.clientId(

                    req

                );

            const services =

                await ServiceService.getActive(

                    clientId

                );

            res.status(200).json({

                success: true,

                data: services

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Get Service
    |--------------------------------------------------------------------------
    */

    static get = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const service =

                await ServiceService.get(

                    String(

                        req.params.id

                    )

                );

            res.status(200).json({

                success: true,

                data: service

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Create Service
    |--------------------------------------------------------------------------
    */

    static create = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const clientId =

                RequestHelper.clientId(

                    req

                );

            const payload: Service = {

                ...req.body,

                client_id: clientId

            };

            const service =

                await ServiceService.create(

                    payload

                );

            res.status(201).json({

                success: true,

                message:

                    "Service created successfully.",

                data: service

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Update Service
    |--------------------------------------------------------------------------
    */

    static update = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            const service =

                await ServiceService.update(

                    String(

                        req.params.id

                    ),

                    req.body

                );

            res.status(200).json({

                success: true,

                message:

                    "Service updated successfully.",

                data: service

            });

        }

    );

    /*
    |--------------------------------------------------------------------------
    | Delete Service
    |--------------------------------------------------------------------------
    */

    static delete = asyncHandler(

        async (

            req: Request,

            res: Response

        ): Promise<void> => {

            await ServiceService.delete(

                String(

                    req.params.id

                )

            );

            res.status(200).json({

                success: true,

                message:

                    "Service deleted successfully."

            });

        }

    );

}