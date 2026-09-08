import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { DodoPaymentsService } from "../services/dodoPaymentsService";

function requiredString(value: unknown, field: string, min = 1, max = 200): string {
  const result = String(value ?? "").trim();
  if (result.length < min || result.length > max) {
    throw new AppError(`${field} is required and must be between ${min} and ${max} characters.`, 400);
  }
  return result;
}

function checkoutInput(req: Request) {
  return {
    business_name: requiredString(req.body.business_name, "Business name", 2, 100),
    owner_name: requiredString(req.body.owner_name, "Owner name", 2, 100),
    email: requiredString(req.body.email, "Email", 5, 254).toLowerCase(),
    phone: requiredString(req.body.phone, "Phone", 7, 30),
    industry: req.body.industry ? requiredString(req.body.industry, "Industry", 2, 80) : undefined,
    plan: req.body.plan ? requiredString(req.body.plan, "Plan", 2, 40) : undefined,
  };
}

export class DodoPaymentsController {
  static async createCheckout(req: Request, res: Response): Promise<void> {
    const result = await DodoPaymentsService.createCheckoutSession(checkoutInput(req), "one_time");
    res.status(201).json({ success: true, message: "Dodo checkout session created.", data: result });
  }

  static async createSubscriptionCheckout(req: Request, res: Response): Promise<void> {
    const result = await DodoPaymentsService.createCheckoutSession(checkoutInput(req), "subscription");
    res.status(201).json({ success: true, message: "Dodo subscription checkout session created.", data: result });
  }

  static async status(req: Request, res: Response): Promise<void> {
    const sessionId = requiredString(req.params.sessionId, "sessionId", 5, 200);
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    const result = await DodoPaymentsService.getCheckoutStatus(sessionId);
    res.status(200).json({ success: true, data: result });
  }

  static async webhook(req: Request, res: Response): Promise<void> {
    if (!Buffer.isBuffer(req.body)) throw new AppError("Webhook raw body is required.", 400);

    const headers = ["webhook-id", "webhook-signature", "webhook-timestamp"].reduce<Record<string, string>>((result, name) => {
      const value = req.header(name)?.trim();
      if (value) result[name] = value;
      return result;
    }, {});

    const eventId = headers["webhook-id"];
    if (!eventId || !headers["webhook-signature"] || !headers["webhook-timestamp"]) {
      throw new AppError("Missing Dodo webhook headers.", 400);
    }

    await DodoPaymentsService.enqueueWebhook(req.body, headers, eventId);
    await DodoPaymentsService.processWebhookQueue();
    res.status(200).json({ success: true, received: true, processed: true });
  }
}
