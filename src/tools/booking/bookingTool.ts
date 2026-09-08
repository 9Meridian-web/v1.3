import { BookingService } from "../../services/booking/bookingService";
import { ServiceRepository } from "../../repositories/serviceRepository";
import { AppError } from "../../errors/AppError";

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
        | FINAL BOOKING SAFETY VALIDATION
        |--------------------------------------------------------------------------
        */

        if (
            !request.clientId?.trim()
        ) {

            throw new AppError(
                "Client ID is required.",
                400
            );

        }

        if (
            !request.customer_name?.trim()
        ) {

            throw new AppError(
                "Customer name is required.",
                400
            );

        }

        if (
            !request.customer_phone?.trim()
        ) {

            throw new AppError(
                "Customer phone is required.",
                400
            );

        }

        if (
            !request.service_name?.trim()
        ) {

            throw new AppError(
                "Service is required.",
                400
            );

        }

        if (
            !request.appointment_date?.trim()
        ) {

            throw new AppError(
                "Appointment date is required.",
                400
            );

        }

        if (
            !request.appointment_time?.trim()
        ) {

            throw new AppError(
                "Appointment time is required.",
                400
            );

        }

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

        const requestedName =
            request.service_name
                .trim()
                .toLowerCase();

        const service =
            services.find(
                item =>
                    item.name
                        .trim()
                        .toLowerCase() ===
                    requestedName
            );

        /*
        |--------------------------------------------------------------------------
        | Service Not Found
        |--------------------------------------------------------------------------
        */

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

        try {

            const booking =
                await BookingService.create({

                    client_id:
                        request.clientId,

                    customer_name:
                        request.customer_name
                            .trim(),

                    customer_phone:
                        request.customer_phone
                            .trim(),

                    customer_email:
                        request.customer_email
                            ?.trim(),

                    service_id:
                        service.id!,

                    appointment_date:
                        request.appointment_date
                            .trim(),

                    appointment_time:
                        request.appointment_time
                            .trim(),

                    reason:
                        request.reason
                            ?.trim(),

                    notes:
                        request.notes
                            ?.trim()

                });

            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            return {

                success: true,

                message:
                    "Your appointment has been booked successfully.",

                booking

            };

        }

        catch (
            error
        ) {

            /*
            |--------------------------------------------------------------------------
            | OCCUPIED SLOT
            |--------------------------------------------------------------------------
            |
            | BookingService correctly reports an occupied slot as 409.
            | Convert it into a customer-friendly response.
            |--------------------------------------------------------------------------
            */

            if (
                error instanceof AppError &&
                error.statusCode === 409
            ) {

                return {

                    success: false,

                    message:
                        "That appointment time is already occupied. Please choose another time."

                };

            }

            /*
            |--------------------------------------------------------------------------
            | Unknown Error
            |--------------------------------------------------------------------------
            */

            throw error;

        }

    }

}