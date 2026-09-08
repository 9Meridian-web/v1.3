-- Production SaaS lifecycle migration for AI Receptionist.
-- Run this in Supabase SQL Editor before deploying the upgraded backend.

alter table if exists public.clients
    add column if not exists plan text not null default 'Starter',
    add column if not exists payment_status text not null default 'pending',
    add column if not exists onboarding_status text not null default 'onboarding',
    add column if not exists public_agent_slug text unique,
    add column if not exists published_at timestamptz;

alter table if exists public.google_connections
    add column if not exists refresh_token_encrypted text;

alter table if exists public.agents
    add column if not exists public_slug text unique,
    add column if not exists dify_app_id text,
    add column if not exists published_at timestamptz;

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references public.clients(id) on delete set null,
    provider text not null,
    provider_payment_id text not null unique,
    amount numeric(12,2),
    currency text not null default 'INR',
    status text not null default 'pending',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists orders_client_id_idx on public.orders(client_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists google_connections_client_id_idx on public.google_connections(client_id);
create index if not exists agents_client_id_idx on public.agents(client_id);

alter table public.orders enable row level security;

-- The backend uses the Supabase service role and is therefore not blocked by RLS.
-- No anonymous/browser policy is intentionally created for orders.

comment on column public.google_connections.refresh_token_encrypted is
    'AES-256-GCM encrypted Google refresh token. Legacy refresh_token may remain temporarily during migration.';

-- Provider-neutral payment lifecycle ------------------------------------------
alter table public.orders
    alter column provider_payment_id drop not null;

alter table public.orders
    add column if not exists provider_order_id text,
    add column if not exists amount_paise bigint,
    add column if not exists receipt text;

create unique index if not exists orders_provider_order_id_uidx
    on public.orders(provider, provider_order_id)
    where provider_order_id is not null;

create index if not exists orders_provider_payment_id_idx
    on public.orders(provider, provider_payment_id);

alter table public.clients
    add column if not exists payment_order_id text;

create unique index if not exists clients_payment_order_id_uidx
    on public.clients(payment_order_id)
    where payment_order_id is not null;

create table if not exists public.payment_webhook_events (
    id uuid primary key default gen_random_uuid(),
    event_id text not null unique,
    event_name text not null,
    payload jsonb not null,
    signature text not null,
    received_at timestamptz not null default now(),
    processed_at timestamptz,
    processing_at timestamptz,
    attempts integer not null default 0,
    next_attempt_at timestamptz,
    last_error text
);

create index if not exists payment_webhook_events_pending_idx
    on public.payment_webhook_events(received_at)
    where processed_at is null;

alter table public.payment_webhook_events enable row level security;

comment on table public.payment_webhook_events is
    'Durable provider webhook inbox. The application acknowledges verified events immediately and processes them asynchronously.';
