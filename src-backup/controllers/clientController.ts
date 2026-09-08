import { Request, Response } from "express";

import { ClientService } from "../services/clients/clientService";

export class ClientController {

    /*
    |--------------------------------------------------------------------------
    | Create Client
    |--------------------------------------------------------------------------
    */

    static async create(

        req: Request,

        res: Response

    ): Promise<void> {

        const client = await ClientService.create(req.body);

        res.status(201).json({

            success: true,

            message: "Client created successfully.",

            data: client

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Get Client
    |--------------------------------------------------------------------------
    */

    static async get(

        req: Request,

        res: Response

    ): Promise<void> {

        const client = await ClientService.get(

            String(req.params.id)

        );

        res.status(200).json({

            success: true,

            data: client

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Get All Clients
    |--------------------------------------------------------------------------
    */

    static async getAll(

        req: Request,

        res: Response

    ): Promise<void> {

        const clients = await ClientService.getAll();

        res.status(200).json({

            success: true,

            data: clients

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Update Client
    |--------------------------------------------------------------------------
    */

    static async update(

        req: Request,

        res: Response

    ): Promise<void> {

        const client = await ClientService.update(

            String(req.params.id),

            req.body

        );

        res.status(200).json({

            success: true,

            message: "Client updated successfully.",

            data: client

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Delete Client
    |--------------------------------------------------------------------------
    */

    static async delete(

        req: Request,

        res: Response

    ): Promise<void> {

        await ClientService.delete(

            String(req.params.id)

        );

        res.status(200).json({

            success: true,

            message: "Client deleted successfully."

        });

    }

}