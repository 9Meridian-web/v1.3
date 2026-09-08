import { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/AppError";
import { BookingRepository } from "../repositories/bookingRepository";
import { ServiceRepository } from "../repositories/serviceRepository";
import { AgentRepository } from "../repositories/agentRepository";

/*
|--------------------------------------------------------------------------
| Client Ownership
|--------------------------------------------------------------------------
|
| Every authenticated request is already associated with one client through
| req.user.clientId. These middleware functions make sure route parameters
| cannot be used to access another client's resources.
|
|--------------------------------------------------------------------------
*/

export function requireOwnClientParam(
    paramName: string
) {

    return (
        req: Request,
        _res: Response,
        next: NextFunction
    ): void => {

        const requestedClientId =
            req.params[paramName];

        if (!requestedClientId) {
            return next(
                new AppError(
                    "Client ID is required.",
                    400
                )
            );
        }

        if (
            requestedClientId !== req.user.clientId
        ) {
            return next(
                new AppError(
                    "You are not authorized to access this client.",
                    403
                )
            );
        }

        next();

    };
}

export async function requireOwnBooking(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {

    try {

        const bookingId = String(req.params.id ?? "");

        if (!bookingId) {
            return next(
                new AppError(
                    "Booking ID is required.",
                    400
                )
            );
        }

        const booking =
            await BookingRepository.findById(
                bookingId
            );

        if (
            booking.client_id !== req.user.clientId
        ) {
            return next(
                new AppError(
                    "Booking not found.",
                    404
                )
            );
        }

        next();

    } catch (error) {

        next(error);

    }
}

export async function requireOwnService(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {

    try {

        const serviceId = String(req.params.id ?? "");

        if (!serviceId) {
            return next(
                new AppError(
                    "Service ID is required.",
                    400
                )
            );
        }

        const service =
            await ServiceRepository.get(
                serviceId
            );

        if (
            service.client_id !== req.user.clientId
        ) {
            return next(
                new AppError(
                    "Service not found.",
                    404
                )
            );
        }

        next();

    } catch (error) {

        next(error);

    }
}


export async function requireOwnAgent(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const agentId = String(req.params.id ?? "");
        if (!agentId) return next(new AppError("Agent ID is required.", 400));
        const agent = await AgentRepository.findById(agentId);
        if (!agent || agent.client_id !== req.user.clientId) {
            return next(new AppError("Agent not found.", 404));
        }
        next();
    } catch (error) {
        next(error);
    }
}
