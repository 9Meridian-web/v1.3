import crypto from "node:crypto";
import DodoPayments from "dodopayments";

import { AppError } from "../errors/AppError";
import { env } from "../config/env";
import { createSetupToken } from "../helpers/setupToken";
import { supabase } from "../config/supabase";

type PaymentType = "one_time" | "subscription";
type JsonRecord = Record<string, unknown>;

interface CheckoutCustomer {
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  industry?: string;
  plan?: string;
}

interface DodoWebhookEvent {
  type: string;
  data: JsonRecord;
  timestamp?: string;
}

const supportedPlans = ["Single Bot", "Dual Bot Pack", "Full Front Line"] as const;
type SupportedPlan = (typeof supportedPlans)[number];

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function productIdFor(plan: SupportedPlan, paymentType: PaymentType): string {
  const products: Record<SupportedPlan, Record<PaymentType, string>> = {
    "Single Bot": {
      one_time: env.DODO_PRODUCT_SINGLE_BOT_SETUP,
      subscription: env.DODO_PRODUCT_SINGLE_BOT_SUBSCRIPTION,
    },
    "Dual Bot Pack": {
      one_time: env.DODO_PRODUCT_DUAL_BOT_PACK_SETUP,
      subscription: env.DODO_PRODUCT_DUAL_BOT_PACK_SUBSCRIPTION,
    },
    "Full Front Line": {
      one_time: env.DODO_PRODUCT_FULL_FRONT_LINE_SETUP,
      subscription: env.DODO_PRODUCT_FULL_FRONT_LINE_SUBSCRIPTION,
    },
  };
  return products[plan][paymentType];
}

function normalizePlan(plan: string | undefined): SupportedPlan {
  const selected = plan?.trim() || env.DODO_DEFAULT_PLAN;
  if ((supportedPlans as readonly string[]).includes(selected)) return selected as SupportedPlan;
  throw new AppError("Invalid payment plan.", 400);
}

function dodoClient(): DodoPayments {
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
  });
}

function providerError(error: unknown, action: string): AppError {
  const message = error instanceof Error ? error.message : "Unknown provider error.";
  console.error(`Dodo Payments ${action} failed:`, message);
  return new AppError(`Unable to ${action}. Please try again later.`, 502);
}

export class DodoPaymentsService {
  static async createCheckoutSession(customer: CheckoutCustomer, paymentType: PaymentType): Promise<{
    session_id: string;
    checkout_url: string;
    plan: SupportedPlan;
    payment_type: PaymentType;
  }> {
    const plan = normalizePlan(customer.plan);
    const productId = productIdFor(plan, paymentType);
    if (!productId) {
      throw new AppError(`The ${paymentType === "subscription" ? "subscription" : "setup"} product for this plan is not configured.`, 503);
    }

    const metadata: Record<string, string> = {
      business_name: customer.business_name.trim(),
      owner_name: customer.owner_name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
      industry: customer.industry?.trim() || "general",
      plan,
      payment_type: paymentType,
    };

    let session: { session_id: string; checkout_url?: string | null };
    try {
      session = await dodoClient().checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: metadata.email, name: metadata.owner_name, phone_number: metadata.phone },
        customer_business_name: metadata.business_name,
        metadata,
        return_url: env.DODO_CHECKOUT_RETURN_URL,
        cancel_url: env.DODO_CHECKOUT_CANCEL_URL,
      });
    } catch (error) {
      throw providerError(error, "create checkout");
    }

    if (!session.checkout_url) throw new AppError("Dodo did not return a hosted checkout URL.", 502);

    const { error } = await supabase.from("orders").insert({
      provider: "dodo",
      provider_order_id: session.session_id,
      provider_payment_id: null,
      product_id: productId,
      payment_type: paymentType,
      status: "created",
      currency: env.DODO_PAYMENT_CURRENCY,
      metadata,
    });
    if (error) {
      console.error("Dodo checkout database error:", error.message);
      throw new AppError("Unable to initialize the payment checkout.", 500);
    }

    return { session_id: session.session_id, checkout_url: session.checkout_url, plan, payment_type: paymentType };
  }

  static async getCheckoutStatus(sessionId: string): Promise<{ status: string; client_id: string | null; setup_token: string | null }> {
    const { data: order, error } = await supabase
      .from("orders")
      .select("status,client_id")
      .eq("provider", "dodo")
      .eq("provider_order_id", sessionId)
      .maybeSingle();
    if (error) throw new AppError("Unable to check the payment status.", 500);
    if (!order) throw new AppError("Payment checkout not found.", 404);
    if (!order.client_id) return { status: String(order.status ?? "created"), client_id: null, setup_token: null };
    return { status: String(order.status), client_id: String(order.client_id), setup_token: createSetupToken(String(order.client_id)) };
  }

  static async enqueueWebhook(rawBody: Buffer, headers: Record<string, string>, eventId: string): Promise<void> {
    let event: DodoWebhookEvent;
    try {
      // The SDK exposes a discriminated union for the webhook payload. We
      // validate the shared fields immediately below before persisting it.
      event = dodoClient().webhooks.unwrap(rawBody.toString("utf8"), { headers }) as unknown as DodoWebhookEvent;
    } catch {
      throw new AppError("Invalid Dodo webhook signature or payload.", 400);
    }
    if (!eventId || eventId.length > 200 || !event.type || !event.data || typeof event.data !== "object") {
      throw new AppError("Invalid Dodo webhook event.", 400);
    }
    const { error } = await supabase.from("dodo_webhook_events").insert({
      event_id: eventId,
      event_name: event.type,
      payload: event,
      received_at: new Date().toISOString(),
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error("Dodo webhook queue error:", error.message);
      throw new AppError("Unable to queue the payment webhook.", 500);
    }
  }

  static async processWebhookQueue(): Promise<void> {
    const { data: events, error } = await supabase
      .from("dodo_webhook_events")
      .select("id,payload,attempts")
      .is("processed_at", null)
      .lt("attempts", 10)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`)
      .order("received_at", { ascending: true })
      .limit(10);
    if (error) {
      console.error("Dodo webhook queue lookup error:", error.message);
      return;
    }
    for (const item of events ?? []) {
      const attempts = Number(item.attempts ?? 0) + 1;
      const { data: claimed } = await supabase.from("dodo_webhook_events")
        .update({ processing_at: new Date().toISOString(), attempts })
        .eq("id", item.id).is("processed_at", null)
        .or(`processing_at.is.null,processing_at.lt.${new Date(Date.now() - 300_000).toISOString()}`)
        .select("id").maybeSingle();
      if (!claimed) continue;
      try {
        await this.processWebhookEvent(asRecord(item.payload));
        await supabase.from("dodo_webhook_events").update({ processed_at: new Date().toISOString(), last_error: null }).eq("id", item.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Webhook processing failed.";
        const delayMs = Math.min(3_600_000, 2 ** Math.min(attempts, 10) * 1000);
        await supabase.from("dodo_webhook_events").update({
          attempts,
          last_error: message.slice(0, 1000),
          next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
        }).eq("id", item.id);
      }
    }
  }

  private static async processWebhookEvent(event: JsonRecord): Promise<void> {
    const eventName = stringValue(event.type);
    const data = asRecord(event.data);
    if (!eventName) return;

    if (eventName === "payment.succeeded") {
      await this.handleSucceededPayment(data);
      return;
    }
    if (["payment.failed", "payment.cancelled"].includes(eventName)) {
      await this.updatePaymentState(data, eventName === "payment.failed" ? "failed" : "cancelled");
      return;
    }
    if (eventName.startsWith("subscription.")) await this.upsertSubscription(data, eventName);
  }

  private static async handleSucceededPayment(payment: JsonRecord): Promise<void> {
    const sessionId = stringValue(payment.checkout_session_id);
    const paymentId = stringValue(payment.payment_id);
    if (!sessionId || !paymentId) throw new AppError("Successful Dodo payment is missing identifiers.", 400);
    const { data: order, error } = await supabase.from("orders").select("*")
      .eq("provider", "dodo").eq("provider_order_id", sessionId).maybeSingle();
    if (error) throw new AppError("Unable to load the payment checkout.", 500);
    if (!order) throw new AppError("Dodo payment checkout is not registered.", 404);

    await this.fulfilPaidOrder(
      order,
      paymentId,
      stringValue(asRecord(payment.customer).customer_id),
      stringValue(payment.subscription_id),
      stringValue(payment.currency),
      typeof payment.total_amount === "number" && Number.isSafeInteger(payment.total_amount) ? payment.total_amount : null,
    );
  }

  private static async updatePaymentState(payment: JsonRecord, status: "failed" | "cancelled"): Promise<void> {
    const sessionId = stringValue(payment.checkout_session_id);
    if (!sessionId) return;
    const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() })
      .eq("provider", "dodo").eq("provider_order_id", sessionId).is("client_id", null);
    if (error) throw new AppError("Unable to update the payment status.", 500);
  }

  private static async fulfilPaidOrder(
    order: JsonRecord,
    paymentId: string,
    customerId: string | null,
    subscriptionId: string | null,
    currency: string | null,
    amountMinor: number | null,
  ): Promise<void> {
    const paymentFields = {
      provider_payment_id: paymentId,
      provider_customer_id: customerId,
      provider_subscription_id: subscriptionId,
      ...(currency ? { currency: currency.toUpperCase() } : {}),
      ...(amountMinor !== null ? { provider_amount_minor: amountMinor } : {}),
      status: "paid",
      updated_at: new Date().toISOString(),
    };
    if (order.client_id) {
      const { error } = await supabase.from("orders").update(paymentFields).eq("id", order.id);
      if (error) throw new AppError("Unable to update the paid order.", 500);
      return;
    }
    const metadata = asRecord(order.metadata);
    const required = ["business_name", "owner_name", "email", "phone"];
    if (required.some(key => !stringValue(metadata[key]))) throw new AppError("Payment checkout is missing onboarding information.", 500);

    const clientId = crypto.randomUUID();
    const checkoutId = String(order.provider_order_id);
    const { error: clientError } = await supabase.from("clients").insert({
      id: clientId,
      business_name: String(metadata.business_name), owner_name: String(metadata.owner_name), industry: String(metadata.industry ?? "general"),
      email: String(metadata.email).toLowerCase(), phone: String(metadata.phone), locale: "en-IN", timezone: "Asia/Kolkata",
      date_format: "yyyy-MM-dd", time_format: "12h", is_active: true, payment_status: "paid", onboarding_status: "onboarding",
      plan: String(metadata.plan ?? env.DODO_DEFAULT_PLAN), payment_order_id: checkoutId,
    });
    if (clientError && !/duplicate|unique/i.test(clientError.message)) throw new AppError("Unable to create the client after payment confirmation.", 500);

    const { data: client } = await supabase.from("clients").select("id").eq("payment_order_id", checkoutId).maybeSingle();
    if (!client) throw new AppError("Unable to associate the confirmed payment with a client.", 500);
    const clientIdToUse = String(client.id);
    const { error: orderError } = await supabase.from("orders").update({
      client_id: clientIdToUse,
      ...paymentFields,
    }).eq("id", order.id);
    if (orderError) throw new AppError("Unable to finalize the paid order.", 500);
    if (subscriptionId) {
      await supabase.from("subscriptions").update({ client_id: clientIdToUse, provider_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("provider", "dodo").eq("provider_subscription_id", subscriptionId);
    }
  }

  private static async upsertSubscription(subscription: JsonRecord, eventName: string): Promise<void> {
    const subscriptionId = stringValue(subscription.subscription_id);
    if (!subscriptionId) throw new AppError("Dodo subscription event is missing a subscription ID.", 400);
    const customer = asRecord(subscription.customer);
    const customerId = stringValue(customer.customer_id);
    const status = stringValue(subscription.status) ?? eventName.split(".")[1] ?? "unknown";
    const { data: matchingOrder } = await supabase.from("orders").select("client_id")
      .eq("provider", "dodo").eq("provider_subscription_id", subscriptionId).maybeSingle();
    const { error } = await supabase.from("subscriptions").upsert({
      provider: "dodo", provider_subscription_id: subscriptionId, provider_customer_id: customerId,
      client_id: matchingOrder?.client_id ?? null, product_id: stringValue(subscription.product_id), status,
      started_at: stringValue(subscription.created_at), current_period_start: stringValue(subscription.previous_billing_date),
      current_period_end: stringValue(subscription.next_billing_date), cancelled_at: stringValue(subscription.cancelled_at),
      metadata: subscription, updated_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_subscription_id" });
    if (error) throw new AppError("Unable to update subscription status.", 500);
  }
}
