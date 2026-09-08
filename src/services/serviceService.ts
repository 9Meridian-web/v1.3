import { AppError } from "../errors/AppError";

import { Service } from "../types/service";

import { ServiceRepository } from "../repositories/serviceRepository";

export class ServiceService {
    static async getServices(

        clientId: string

    ): Promise<Service[]> {

        return await ServiceRepository.getAll(

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Create
    |--------------------------------------------------------------------------
    */

    static async create(

        service: Service

    ): Promise<Service> {

        await this.ensureUniqueName(

            service.client_id,

            service.name

        );

        this.validate(

            service

        );

        return await ServiceRepository.create(

            service

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get
    |--------------------------------------------------------------------------
    */

    static async get(

        id: string

    ): Promise<Service> {

        return await ServiceRepository.get(

            id

        );

    }

    static async getForClient(

        id: string,

        clientId: string

    ): Promise<Service> {

        return await ServiceRepository.getForClient(

            id,

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get All
    |--------------------------------------------------------------------------
    */

    static async getAll(

        clientId: string

    ): Promise<Service[]> {

        return await ServiceRepository.getAll(

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Active
    |--------------------------------------------------------------------------
    */

    static async getActive(

        clientId: string

    ): Promise<Service[]> {

        return await ServiceRepository.getActive(

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    static async search(

        clientId: string,

        keyword: string

    ): Promise<Service[]> {

        return await ServiceRepository.search(

            clientId,

            keyword

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    */

    static async update(

        id: string,

        updates: Partial<Service>

    ): Promise<Service> {

        if (

            updates.duration_minutes !== undefined &&

            updates.duration_minutes <= 0

        ) {

            throw new AppError(

                "Duration must be greater than zero.",

                400

            );

        }

        if (

            updates.price !== undefined &&

            updates.price < 0

        ) {

            throw new AppError(

                "Price cannot be negative.",

                400

            );

        }

        return await ServiceRepository.update(

            id,

            updates

        );

    }

    static async updateForClient(

        id: string,

        clientId: string,

        updates: Partial<Service>

    ): Promise<Service> {

        if (

            updates.duration_minutes !== undefined &&

            updates.duration_minutes <= 0

        ) {

            throw new AppError(

                "Duration must be greater than zero.",

                400

            );

        }

        if (

            updates.price !== undefined &&

            updates.price < 0

        ) {

            throw new AppError(

                "Price cannot be negative.",

                400

            );

        }

        return await ServiceRepository.updateForClient(

            id,

            clientId,

            updates

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Delete
    |--------------------------------------------------------------------------
    */

    static async delete(

        id: string

    ): Promise<void> {

        await ServiceRepository.delete(

            id

        );

    }

    static async deleteForClient(

        id: string,

        clientId: string

    ): Promise<void> {

        await ServiceRepository.deleteForClient(

            id,

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    private static validate(

        service: Service

    ): void {

        if (

            service.duration_minutes <= 0

        ) {

            throw new AppError(

                "Duration must be greater than zero.",

                400

            );

        }

        if (

            service.price < 0

        ) {

            throw new AppError(

                "Price cannot be negative.",

                400

            );

        }

    }

    /*
    |--------------------------------------------------------------------------
    | Duplicate Name Check
    |--------------------------------------------------------------------------
    */

    private static async ensureUniqueName(

        clientId: string,

        name: string

    ): Promise<void> {

        const services =

            await ServiceRepository.search(

                clientId,

                name

            );

        const duplicate =

            services.find(

                service =>

                    service.name

                        .toLowerCase()

                        .trim() ===

                    name

                        .toLowerCase()

                        .trim()

            );

        if (

            duplicate

        ) {

            throw new AppError(

                "A service with this name already exists.",

                409

            );

        }

    }

}