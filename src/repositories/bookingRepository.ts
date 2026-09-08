import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";
import { Booking } from "../types/booking";


export class BookingRepository {


    /*
    |--------------------------------------------------------------------------
    | Constants
    |--------------------------------------------------------------------------
    */

    private static readonly QUERY_TIMEOUT_MS = 10000;


    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    private static requireId(
        value: string | undefined | null,
        field: string
    ): string {

        const normalized =
            String(value ?? "").trim();


        if (!normalized) {

            throw new AppError(
                `${field} is required.`,
                400
            );

        }


        return normalized;

    }


    /*
    |--------------------------------------------------------------------------
    | Database Error Mapping
    |--------------------------------------------------------------------------
    */

    private static databaseError(
        error: unknown,
        fallback: string
    ): AppError {

        const value =
            error as {
                message?: unknown;
                code?: unknown;
                details?: unknown;
                hint?: unknown;
            };


        const code =
            typeof value?.code === "string"
                ? value.code
                : undefined;


        /*
        |--------------------------------------------------------------------------
        | Unique Violation
        |--------------------------------------------------------------------------
        */

        if (
            code === "23505"
        ) {

            return new AppError(
                "This booking conflicts with an existing booking.",
                409
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Exclusion Constraint
        |--------------------------------------------------------------------------
        |
        | appointments_no_active_overlap
        |
        | This is the final database-level protection against overlapping
        | active appointments for the same client.
        |--------------------------------------------------------------------------
        */

        if (
            code === "23P01"
        ) {

            return new AppError(
                "This appointment time is no longer available. Please choose another time.",
                409
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Foreign Key Violation
        |--------------------------------------------------------------------------
        */

        if (
            code === "23503"
        ) {

            return new AppError(
                "The booking references data that no longer exists.",
                400
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Check Constraint
        |--------------------------------------------------------------------------
        */

        if (
            code === "23514"
        ) {

            return new AppError(
                "The booking contains invalid data.",
                400
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Not Null Violation
        |--------------------------------------------------------------------------
        */

        if (
            code === "23502"
        ) {

            return new AppError(
                "Required booking information is missing.",
                400
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Invalid Text Representation
        |--------------------------------------------------------------------------
        */

        if (
            code === "22P02"
        ) {

            return new AppError(
                "The booking contains invalid data.",
                400
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Postgres Serialization / Deadlock
        |--------------------------------------------------------------------------
        |
        | These can happen during concurrent production traffic.
        |
        | We expose a retryable-style 409 instead of leaking raw database
        | internals to the client.
        |--------------------------------------------------------------------------
        */

        if (
            code === "40001" ||
            code === "40P01"
        ) {

            return new AppError(
                "The booking could not be completed because another operation was in progress. Please try again.",
                409
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Do Not Leak Raw Database Errors
        |--------------------------------------------------------------------------
        */

        return new AppError(
            fallback,
            500
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Create
    |--------------------------------------------------------------------------
    */

    static async create(
        booking: Booking
    ): Promise<Booking> {

        if (
            !booking.client_id
        ) {

            throw new AppError(
                "Client ID is required.",
                400
            );

        }


        if (
            !booking.service_id
        ) {

            throw new AppError(
                "Service ID is required.",
                400
            );

        }


        if (
            !booking.customer_name?.trim()
        ) {

            throw new AppError(
                "Customer name is required.",
                400
            );

        }


        if (
            !booking.customer_phone?.trim()
        ) {

            throw new AppError(
                "Customer phone is required.",
                400
            );

        }


        if (
            !booking.appointment_date
        ) {

            throw new AppError(
                "Appointment date is required.",
                400
            );

        }


        if (
            !booking.appointment_time
        ) {

            throw new AppError(
                "Appointment time is required.",
                400
            );

        }


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .insert(booking)

            .select()

            .single();


        if (
            error ||
            !data
        ) {

            throw this.databaseError(
                error,
                "Unable to create booking."
            );

        }


        return data;

    }


    /*
    |--------------------------------------------------------------------------
    | Find By ID
    |--------------------------------------------------------------------------
    */

    static async findById(
        id: string
    ): Promise<Booking> {

        const bookingId =
            this.requireId(
                id,
                "Booking ID"
            );


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .select("*")

            .eq(
                "id",
                bookingId
            )

            .maybeSingle();


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to retrieve booking."
            );

        }


        if (
            !data
        ) {

            throw new AppError(
                "Booking not found.",
                404
            );

        }


        return data;

    }


    /*
    |--------------------------------------------------------------------------
    | Find By ID For Client
    |--------------------------------------------------------------------------
    */

    static async findByIdForClient(
        id: string,
        clientId: string
    ): Promise<Booking> {

        const bookingId =
            this.requireId(
                id,
                "Booking ID"
            );


        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        const queryPromise =
            supabase

                .from("appointments")

                .select("*")

                .eq(
                    "id",
                    bookingId
                )

                .eq(
                    "client_id",
                    normalizedClientId
                )

                .maybeSingle();


        const timeoutPromise =
            new Promise<never>(
                (_, reject) => {

                    setTimeout(
                        () => {

                            reject(
                                new AppError(
                                    "Booking database query timed out.",
                                    504
                                )
                            );

                        },
                        this.QUERY_TIMEOUT_MS
                    );

                }
            );


        try {

            const {
                data,
                error
            } = await Promise.race([

                queryPromise,

                timeoutPromise

            ]);


            if (
                error
            ) {

                throw this.databaseError(
                    error,
                    "Unable to retrieve booking."
                );

            }


            if (
                !data
            ) {

                throw new AppError(
                    "Booking not found.",
                    404
                );

            }


            return data;

        }

        catch (error) {

            if (
                error instanceof AppError
            ) {

                throw error;

            }


            throw this.databaseError(
                error,
                "Unable to retrieve booking."
            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Find By Date
    |--------------------------------------------------------------------------
    */

    static async findByDate(
        clientId: string,
        appointmentDate: string,
        excludeBookingId?: string
    ): Promise<Booking[]> {

        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        if (
            !appointmentDate?.trim()
        ) {

            throw new AppError(
                "Appointment date is required.",
                400
            );

        }


        let query =
            supabase

                .from("appointments")

                .select("*")

                .eq(
                    "client_id",
                    normalizedClientId
                )

                .eq(
                    "appointment_date",
                    appointmentDate
                )

                .neq(
                    "status",
                    "cancelled"
                );


        if (
            excludeBookingId?.trim()
        ) {

            query =
                query.neq(
                    "id",
                    excludeBookingId.trim()
                );

        }


        const {
            data,
            error
        } =
            await query

                .order(
                    "appointment_time"
                );


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to retrieve bookings."
            );

        }


        return data ?? [];

    }


    /*
    |--------------------------------------------------------------------------
    | Find Between Dates
    |--------------------------------------------------------------------------
    */

    static async findByDateRange(
        clientId: string,
        startDate: string,
        endDate: string
    ): Promise<Booking[]> {

        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        if (
            !startDate?.trim()
        ) {

            throw new AppError(
                "Start date is required.",
                400
            );

        }


        if (
            !endDate?.trim()
        ) {

            throw new AppError(
                "End date is required.",
                400
            );

        }


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .select("*")

            .eq(
                "client_id",
                normalizedClientId
            )

            .gte(
                "appointment_date",
                startDate
            )

            .lte(
                "appointment_date",
                endDate
            )

            .order(
                "appointment_date"
            )

            .order(
                "appointment_time"
            );


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to retrieve bookings."
            );

        }


        return data ?? [];

    }


    /*
    |--------------------------------------------------------------------------
    | Find Client Bookings
    |--------------------------------------------------------------------------
    */

    static async findByClient(
        clientId: string
    ): Promise<Booking[]> {

        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .select("*")

            .eq(
                "client_id",
                normalizedClientId
            )

            .order(
                "appointment_date"
            )

            .order(
                "appointment_time"
            );


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to retrieve client bookings."
            );

        }


        return data ?? [];

    }


    /*
    |--------------------------------------------------------------------------
    | Active Bookings
    |--------------------------------------------------------------------------
    */

    static async findActiveBookings(
        clientId: string
    ): Promise<Booking[]> {

        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .select("*")

            .eq(
                "client_id",
                normalizedClientId
            )

            .in(
                "status",
                [
                    "confirmed",
                    "pending"
                ]
            )

            .order(
                "appointment_date"
            )

            .order(
                "appointment_time"
            );


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to retrieve active bookings."
            );

        }


        return data ?? [];

    }


    /*
    |--------------------------------------------------------------------------
    | Find By Service
    |--------------------------------------------------------------------------
    */

    static async findByService(
        clientId: string,
        serviceId: string
    ): Promise<Booking[]> {

        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        const normalizedServiceId =
            this.requireId(
                serviceId,
                "Service ID"
            );


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .select("*")

            .eq(
                "client_id",
                normalizedClientId
            )

            .eq(
                "service_id",
                normalizedServiceId
            )

            .order(
                "appointment_date"
            )

            .order(
                "appointment_time"
            );


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to retrieve service bookings."
            );

        }


        return data ?? [];

    }


    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    |
    | Used by internal services such as rescheduling.
    |
    | This method intentionally permits scheduling fields because the
    | RescheduleBookingService performs the required orchestration.
    |--------------------------------------------------------------------------
    */

    static async update(
        id: string,
        updates: Partial<Booking>
    ): Promise<Booking> {

        const bookingId =
            this.requireId(
                id,
                "Booking ID"
            );


        if (
            !updates ||
            Object.keys(updates).length === 0
        ) {

            throw new AppError(
                "At least one booking update is required.",
                400
            );

        }


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .update({

                ...updates,

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                bookingId
            )

            .select()

            .maybeSingle();


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to update booking."
            );

        }


        if (
            !data
        ) {

            throw new AppError(
                "Booking not found.",
                404
            );

        }


        return data;

    }


    /*
    |--------------------------------------------------------------------------
    | Update For Client
    |--------------------------------------------------------------------------
    |
    | Client-scoped update.
    |--------------------------------------------------------------------------
    */

    static async updateForClient(
        id: string,
        clientId: string,
        updates: Partial<Booking>
    ): Promise<Booking> {

        const bookingId =
            this.requireId(
                id,
                "Booking ID"
            );


        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        if (
            !updates ||
            Object.keys(updates).length === 0
        ) {

            throw new AppError(
                "At least one booking update is required.",
                400
            );

        }


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .update({

                ...updates,

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                bookingId
            )

            .eq(
                "client_id",
                normalizedClientId
            )

            .select()

            .maybeSingle();


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to update booking."
            );

        }


        if (
            !data
        ) {

            throw new AppError(
                "Booking not found.",
                404
            );

        }


        return data;

    }


    /*
    |--------------------------------------------------------------------------
    | Update Sheet Row
    |--------------------------------------------------------------------------
    */

    static async updateSheetRow(
        bookingId: string,
        sheetRow: number
    ): Promise<void> {

        const normalizedBookingId =
            this.requireId(
                bookingId,
                "Booking ID"
            );


        if (
            !Number.isInteger(sheetRow) ||
            sheetRow < 2
        ) {

            throw new AppError(
                "Invalid Google Sheets row number.",
                400
            );

        }


        const {
            error
        } = await supabase

            .from("appointments")

            .update({

                sheet_row:
                    sheetRow,

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                normalizedBookingId
            );


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to save Google Sheets row."
            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Cancel
    |--------------------------------------------------------------------------
    */

    static async cancel(
        id: string
    ): Promise<Booking> {

        const bookingId =
            this.requireId(
                id,
                "Booking ID"
            );


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .update({

                status:
                    "cancelled",

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                bookingId
            )

            .neq(
                "status",
                "cancelled"
            )

            .select()

            .maybeSingle();


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to cancel booking."
            );

        }


        if (
            !data
        ) {

            throw new AppError(
                "Booking was not found or is already cancelled.",
                404
            );

        }


        return data;

    }


    /*
    |--------------------------------------------------------------------------
    | Delete
    |--------------------------------------------------------------------------
    */

    static async delete(
        id: string
    ): Promise<void> {

        const bookingId =
            this.requireId(
                id,
                "Booking ID"
            );


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .delete()

            .eq(
                "id",
                bookingId
            )

            .select("id")

            .maybeSingle();


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to delete booking."
            );

        }


        if (
            !data
        ) {

            throw new AppError(
                "Booking not found.",
                404
            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Delete For Client
    |--------------------------------------------------------------------------
    */

    static async deleteForClient(
        id: string,
        clientId: string
    ): Promise<void> {

        const bookingId =
            this.requireId(
                id,
                "Booking ID"
            );


        const normalizedClientId =
            this.requireId(
                clientId,
                "Client ID"
            );


        const {
            data,
            error
        } = await supabase

            .from("appointments")

            .delete()

            .eq(
                "id",
                bookingId
            )

            .eq(
                "client_id",
                normalizedClientId
            )

            .select("id")

            .maybeSingle();


        if (
            error
        ) {

            throw this.databaseError(
                error,
                "Unable to delete booking."
            );

        }


        if (
            !data
        ) {

            throw new AppError(
                "Booking not found.",
                404
            );

        }

    }

}