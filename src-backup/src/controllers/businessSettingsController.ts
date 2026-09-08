import { Request, Response } from "express";

import { BusinessSettingsService } from "../services/business/businessSettingsService";

export class BusinessSettingsController {

    /*
    |--------------------------------------------------------------------------
    | Create Business Settings
    |--------------------------------------------------------------------------
    */

    static async create(

        req: Request,

        res: Response

    ): Promise<void> {

        const settings = await BusinessSettingsService.create(

            req.body

        );

        res.status(201).json({

            success: true,

            message: "Business settings created successfully.",

            data: settings

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Get Business Settings
    |--------------------------------------------------------------------------
    */

    static async get(

        req: Request,

        res: Response

    ): Promise<void> {

        const settings = await BusinessSettingsService.get(

            String(req.params.clientId)

        );

        res.status(200).json({

            success: true,

            data: settings

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Update Business Settings
    |--------------------------------------------------------------------------
    */

    static async update(

        req: Request,

        res: Response

    ): Promise<void> {

        const settings = await BusinessSettingsService.update(

            String(req.params.clientId),

            req.body

        );

        res.status(200).json({

            success: true,

            message: "Business settings updated successfully.",

            data: settings

        });

    }

}