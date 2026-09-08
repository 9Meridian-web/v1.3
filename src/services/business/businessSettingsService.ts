import { BusinessSettingsRepository } from "../../repositories/businessSettingsRepository";

import { BusinessSettings } from "../../types/businessSettings";

export class BusinessSettingsService {

    /*
    |--------------------------------------------------------------------------
    | Create Business Settings
    |--------------------------------------------------------------------------
    */

    static async create(

        settings: BusinessSettings

    ): Promise<BusinessSettings> {

        return await BusinessSettingsRepository.create(

            settings

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Get Business Settings
    |--------------------------------------------------------------------------
    */

    static async get(

        clientId: string

    ): Promise<BusinessSettings> {

        return await BusinessSettingsRepository.getByClientId(

            clientId

        );

    }

    /*
    |--------------------------------------------------------------------------
    | Update Business Settings
    |--------------------------------------------------------------------------
    */

    static async update(

        clientId: string,

        updates: Partial<BusinessSettings>

    ): Promise<BusinessSettings> {

        return await BusinessSettingsRepository.update(

            clientId,

            updates

        );

    }

}