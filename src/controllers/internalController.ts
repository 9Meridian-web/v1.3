import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";
import { createSetupToken } from "../helpers/setupToken";

export class InternalController {
    static async paymentConfirmed(req: Request, res: Response): Promise<void> {
        const {
            provider,
            payment_id,
            business_name,
            owner_name,
            email,
            phone,
            industry = "general",
            plan = "Starter",
            amount = null,
            currency = "INR",
        } = req.body as Record<string, unknown>;

        if (!provider || !payment_id || !business_name || !owner_name || !email) {
            throw new AppError("provider, payment_id, business_name, owner_name and email are required.", 400);
        }

        const { data: existingOrder, error: existingError } = await supabase
            .from("orders")
            .select("id,client_id,status")
            .eq("provider_payment_id", String(payment_id))
            .maybeSingle();
        if (existingError) throw new AppError(existingError.message, 500);
        if (existingOrder) {
            res.status(200).json({ success: true, message: "Payment already processed.", data: existingOrder });
            return;
        }

        const clientId = randomUUID();
        const { error: clientError } = await supabase.from("clients").insert({
            id: clientId,
            business_name: String(business_name),
            owner_name: String(owner_name),
            industry: String(industry),
            email: String(email).toLowerCase(),
            phone: phone ? String(phone) : null,
            locale: "en-IN",
            timezone: "Asia/Kolkata",
            date_format: "yyyy-MM-dd",
            time_format: "12h",
            is_active: true,
            payment_status: "paid",
            onboarding_status: "onboarding",
            plan: String(plan),
        });
        if (clientError) throw new AppError(clientError.message, 500);

        const { data: order, error: orderError } = await supabase.from("orders").insert({
            client_id: clientId,
            provider: String(provider),
            provider_payment_id: String(payment_id),
            amount,
            currency: String(currency),
            status: "paid",
        }).select().single();

        if (orderError) {
            await supabase.from("clients").delete().eq("id", clientId);
            throw new AppError(orderError.message, 500);
        }

        res.status(201).json({
            success: true,
            message: "Payment confirmed and client created.",
            data: { client_id: clientId, order_id: order.id, onboarding_status: "onboarding", setup_token: createSetupToken(clientId) },
        });
    }
}
