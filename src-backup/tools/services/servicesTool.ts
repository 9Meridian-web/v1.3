import { ServiceService } from "../../services/serviceService";

import { Service } from "../../types/service";

import {

    ServicesToolInput,

    ServicesToolOutput,

    ServiceItem

} from "./servicesSchemas";

export class ServicesTool {

    /*
    |--------------------------------------------------------------------------
    | Execute
    |--------------------------------------------------------------------------
    */

    static async execute(

        input: ServicesToolInput

    ): Promise<ServicesToolOutput> {

        /*
        |--------------------------------------------------------------------------
        | Get Active Services
        |--------------------------------------------------------------------------
        */

        const services =

            await ServiceService.getActive(

                input.clientId

            );

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */

        const filtered =

            input.search

                ? services.filter(

                    (

                        service: Service

                    ) => {

                        const keyword =

                            input.search!

                                .trim()

                                .toLowerCase();

                        return (

                            service.name

                                .toLowerCase()

                                .includes(

                                    keyword

                                )

                            ||

                            (

                                service.description ??

                                ""

                            )

                                .toLowerCase()

                                .includes(

                                    keyword

                                )

                        );

                    }

                )

                : services;

        /*
        |--------------------------------------------------------------------------
        | Get Single Service
        |--------------------------------------------------------------------------
        */

        if (

            input.serviceId

        ) {

            const service =

                filtered.find(

                    (

                        service: Service

                    ) =>

                        service.id ===

                        input.serviceId

                );

            return {

                success:

                    !!service,

                total:

                    service ? 1 : 0,

                services:

                    service

                        ? [

                            this.map(

                                service

                            )

                        ]

                        : []

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        return {

            success: true,

            total:

                filtered.length,

            services:

                filtered.map(

                    (

                        service: Service

                    ) =>

                        this.map(

                            service

                        )

                )

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Map
    |--------------------------------------------------------------------------
    */

    private static map(

        service: Service

    ): ServiceItem {

        return {

            id:

                service.id!,

            name:

                service.name,

            description:

                service.description,

            category:

                service.category,

            duration:

                service.duration_minutes,

            price:

                service.price,

            currency:

                service.currency,

            active:

                service.is_active,

            online_booking:

                service.online_booking

        };

    }

}