import { ClientRepository } from "../../repositories/clientRepository";

import { Client } from "../../types/client";

export class ClientService {

    /*
    |--------------------------------------------------------------------------
    | Create Client
    |--------------------------------------------------------------------------
    */

    static async create(

        client: Client

    ): Promise<Client> {

        return await ClientRepository.create(

            client

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Client
    |--------------------------------------------------------------------------
    */

    static async get(

        clientId: string

    ): Promise<Client> {

        return await ClientRepository.get(

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get All Clients
    |--------------------------------------------------------------------------
    */

    static async getAll(

    ): Promise<Client[]> {

        return await ClientRepository.getAll();

    }

    /*
    |--------------------------------------------------------------------------
    | Update Client
    |--------------------------------------------------------------------------
    */

    static async update(

        clientId: string,

        updates: Partial<Client>

    ): Promise<Client> {

        return await ClientRepository.update(

            clientId,

            updates

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Delete Client
    |--------------------------------------------------------------------------
    */

    static async delete(

        clientId: string

    ): Promise<void> {

        await ClientRepository.delete(

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Timezone
    |--------------------------------------------------------------------------
    */

    static async getTimezone(

        clientId: string

    ): Promise<string> {

        const client =

            await this.get(

                clientId

            );

        return (

            client.timezone ??

            "UTC"

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Locale
    |--------------------------------------------------------------------------
    */

    static async getLocale(

        clientId: string

    ): Promise<string> {

        const client =

            await this.get(

                clientId

            );

        return (

            client.locale ??

            "en"

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Date Format
    |--------------------------------------------------------------------------
    */

    static async getDateFormat(

        clientId: string

    ): Promise<string> {

        const client =

            await this.get(

                clientId

            );

        return (

            client.date_format ??

            "yyyy-MM-dd"

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Time Format
    |--------------------------------------------------------------------------
    */

    static async getTimeFormat(

        clientId: string

    ): Promise<string> {

        const client =

            await this.get(

                clientId

            );

        return (

            client.time_format ??

            "24h"

        );

    }

}