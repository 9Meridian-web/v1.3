-- Dodo Payments migration. Run after 20260812_production_saas.sql.
-- Historical provider records are deliberately retained for accounting/history.

alter table if exists public.orders
    add column if not exists product_id text,
    add column if not exists payment_type text not null default 'one_time',
    add column if not exists provider_amount_minor bigint,
    add column if not exists provider_customer_id text,
    add column if not exists provider_subscription_id text;

create index if not exists orders_provider_subscription_id_idx
    on public.orders(provider, provider_subscription_id)
    where provider_subscription_id is not null;

create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references public.clients(id) on delete set null,
    provider text not null,
    provider_subscription_id text not null,
    provider_customer_id text,
    product_id text,
    status text not null,
    started_at timestamptz,
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancelled_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(provider, provider_subscription_id)
);

create index if not exists subscriptions_client_id_idx on public.subscriptions(client_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
alter table public.subscriptions enable row level security;

create table if not exists public.dodo_webhook_events (
    id uuid primary key default gen_random_uuid(),
    event_id text not null unique,
    event_name text not null,
    payload jsonb not null,
    received_at timestamptz not null default now(),
    processed_at timestamptz,
    processing_at timestamptz,
    attempts integer not null default 0,
    next_attempt_at timestamptz,
    last_error text
);

create index if not exists dodo_webhook_events_pending_idx
    on public.dodo_webhook_events(received_at)
    where processed_at is null;
alter table public.dodo_webhook_events enable row level security;

comment on table public.dodo_webhook_events is
    'Durable, verified Dodo Payments webhook inbox. event_id is the persistent idempotency key.';
