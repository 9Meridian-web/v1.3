import { BookingService } from "../../services/booking/bookingService";
import { ServiceRepository } from "../../repositories/serviceRepository";

export interface BookingToolRequest {

    clientId: string;

    customer_name: string;

    customer_phone: string;

    customer_email?: string;

    service_name: string;

    appointment_date: string;

    appointment_time: string;

    reason?: string;

    notes?: string;

}

export interface BookingToolResponse {

    success: boolean;

    message: string;

    booking?: unknown;

}

export class BookingTool {

    /*
    |--------------------------------------------------------------------------
    | Execute
    |--------------------------------------------------------------------------
    */

    static async execute(

        request: BookingToolRequest

    ): Promise<BookingToolResponse> {

        /*
        |--------------------------------------------------------------------------
        | Find Requested Service
        |--------------------------------------------------------------------------
        */

        const services =

            await ServiceRepository.search(

                request.clientId,

                request.service_name

            );

        const service =

            services.find(

                service =>

                    service.name

                        .trim()

                        .toLowerCase() ===

                    request.service_name

                        .trim()

                        .toLowerCase()

            );

        if (

            !service

        ) {

            return {

                success: false,

                message:

                    `Service "${request.service_name}" was not found.`

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Create Booking
        |--------------------------------------------------------------------------
        */

        const booking =

            await BookingService.create({

                client_id:

                    request.clientId,

                customer_name:

                    request.customer_name,

                customer_phone:

                    request.customer_phone,

                customer_email:

                    request.customer_email,

                service_id:

                    service.id!,

                appointment_date:

                    request.appointment_date,

                appointment_time:

                    request.appointment_time,

                reason:

                    request.reason,

                notes:

                    request.notes

            });

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return {

            success: true,

            message:

                "Booking created successfully.",

            booking

        };

    }

}