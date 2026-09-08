import { supabase } from "../config/supabase";

import { AppError } from "../errors/AppError";

import { Booking } from "../types/booking";

export class BookingRepository {

    /*
    |--------------------------------------------------------------------------
    | Create
    |--------------------------------------------------------------------------
    */

    static async create(

        booking: Booking

    ): Promise<Booking> {

        const { data, error } = await supabase

            .from("appointments")

            .insert(booking)

            .select()

            .single();

        if (error || !data) {

            throw new AppError(

                error?.message ??

                "Unable to create booking.",

                500

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

        const { data, error } = await supabase

            .from("appointments")

            .select("*")

            .eq("id", id)

            .single();

        if (error || !data) {

            throw new AppError(

                "Booking not found.",

                404

            );

        }

        return data;

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

        let query = supabase

            .from("appointments")

            .select("*")

            .eq(

                "client_id",

                clientId

            )

            .eq(

                "appointment_date",

                appointmentDate

            )

            .neq(

                "status",

                "cancelled"

            );

        if (excludeBookingId) {

            query = query.neq(

                "id",

                excludeBookingId

            );

        }

        const {

            data,

            error

        } = await query.order(

            "appointment_time"

        );

        if (error) {

            throw new AppError(

                error.message,

                500

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

        const {

            data,

            error

        } = await supabase

            .from("appointments")

            .select("*")

            .eq(

                "client_id",

                clientId

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

        if (error) {

            throw new AppError(

                error.message,

                500

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

        const {

            data,

            error

        } = await supabase

            .from("appointments")

            .select("*")

            .eq(

                "client_id",

                clientId

            )

            .order(

                "appointment_date"

            )

            .order(

                "appointment_time"

            );

        if (error) {

            throw new AppError(

                error.message,

                500

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

        const {

            data,

            error

        } = await supabase

            .from("appointments")

            .select("*")

            .eq(

                "client_id",

                clientId

            )

            .in(

                "status",

                [

                    "confirmed",

                    "pending"

                ]

            );

        if (error) {

            throw new AppError(

                error.message,

                500

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

        const {

            data,

            error

        } = await supabase

            .from("appointments")

            .select("*")

            .eq(

                "client_id",

                clientId

            )

            .eq(

                "service_id",

                serviceId

            );

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

        return data ?? [];

    }

    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    */

    static async update(

        id: string,

        updates: Partial<Booking>

    ): Promise<Booking> {

        const {

            data,

            error

        } = await supabase

            .from("appointments")

            .update(updates)

            .eq(

                "id",

                id

            )

            .select()

            .single();

        if (error || !data) {

            throw new AppError(

                error?.message ??

                "Unable to update booking.",

                500

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

        const { error } = await supabase

            .from("appointments")

            .update({

                sheet_row:

                    sheetRow

            })

            .eq(

                "id",

                bookingId

            );

        if (error) {

            throw new AppError(

                error.message,

                500

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

        return await this.update(

            id,

            {

                status:

                    "cancelled"

            }

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

        const { error } = await supabase

            .from("appointments")

            .delete()

            .eq(

                "id",

                id

            );

        if (error) {

            throw new AppError(

                error.message,

                500

            );

        }

    }

}