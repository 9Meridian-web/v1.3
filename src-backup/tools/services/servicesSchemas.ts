/*
|--------------------------------------------------------------------------
| Services Tool Input
|--------------------------------------------------------------------------
*/

export interface ServicesToolInput {

    clientId: string;

    serviceId?: string;

    search?: string;

}

/*
|--------------------------------------------------------------------------
| Service Item
|--------------------------------------------------------------------------
*/

export interface ServiceItem {

    id: string;

    name: string;

    description?: string;

    category?: string;

    duration: number;

    price: number;

    currency: string;

    active: boolean;

    online_booking: boolean;

}

/*
|--------------------------------------------------------------------------
| Services Tool Output
|--------------------------------------------------------------------------
*/

export interface ServicesToolOutput {

    success: boolean;

    total: number;

    services: ServiceItem[];

}