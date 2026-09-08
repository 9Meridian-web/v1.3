# Dodo Payments setup

This backend uses Dodo Payments hosted Checkout Sessions. A browser redirect is never treated as payment confirmation: only a verified Dodo webhook can mark an order paid and create the onboarding client.

## 1. Install and configure

Run `npm install` after pulling this migration. Configure these server-side variables in test mode first:

- `DODO_PAYMENTS_API_KEY`
- `DODO_PAYMENTS_WEBHOOK_KEY`
- `DODO_PAYMENTS_ENVIRONMENT=test_mode`
- `DODO_CHECKOUT_RETURN_URL`
- `DODO_CHECKOUT_CANCEL_URL`
- `DODO_PAYMENT_CURRENCY`
- `DODO_PRODUCT_SINGLE_BOT_SETUP`
- `DODO_PRODUCT_DUAL_BOT_PACK_SETUP`
- `DODO_PRODUCT_FULL_FRONT_LINE_SETUP`
- `DODO_PRODUCT_SINGLE_BOT_SUBSCRIPTION`
- `DODO_PRODUCT_DUAL_BOT_PACK_SUBSCRIPTION`
- `DODO_PRODUCT_FULL_FRONT_LINE_SUBSCRIPTION`

Create matching Dodo products in the Dodo test dashboard. Setup products must be one-time products; subscription products must have monthly recurring pricing. Product IDs never go to the browser.
Set `DODO_PAYMENT_CURRENCY` to the configured product currency. The authoritative payment currency and minor-unit amount are subsequently recorded from Dodo's signed `payment.succeeded` webhook.

## 2. Database migration

Run `supabase/migrations/20260907_dodo_payments.sql` in Supabase before deployment. It keeps historical provider rows, adds provider-neutral fields to `orders`, creates the `subscriptions` lifecycle table, and creates the durable `dodo_webhook_events` idempotency inbox.

## 3. Checkout API

- `POST /api/payments/dodo/checkout` creates a one-time setup checkout.
- `POST /api/payments/dodo/subscriptions/checkout` creates a recurring checkout.
- `GET /api/payments/dodo/status/:sessionId` returns only the server-recorded confirmation state.

Both creation endpoints accept `business_name`, `owner_name`, `email`, `phone`, optional `industry`, and a supported `plan`. They return `session_id` and `checkout_url`; redirect the browser to `checkout_url`.

## 4. Webhook

Configure the Dodo dashboard webhook URL as:

`https://YOUR_API_DOMAIN/api/payments/dodo/webhook`

Subscribe at minimum to `payment.succeeded`, `payment.failed`, `payment.cancelled`, `subscription.active`, `subscription.renewed`, `subscription.updated`, `subscription.on_hold`, `subscription.failed`, `subscription.cancelled`, and `subscription.expired`.

The endpoint requires Dodo's `webhook-id`, `webhook-signature`, and `webhook-timestamp` headers. The official SDK verifies the raw body before the event enters the persistent inbox. Duplicate IDs return 2xx without repeating side effects.

## 5. Test and go live

Use Dodo test products, test API key, and test webhook key to create a checkout and deliver a signed webhook. Confirm that the webhook creates the client only after `payment.succeeded`. Configure a public HTTPS endpoint before enabling live webhooks. Switch only the environment, API key, webhook key, and product IDs to `live_mode`; test them before accepting live payments.
