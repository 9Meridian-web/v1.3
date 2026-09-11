-- Compatibility repair for databases that already had a legacy subscriptions
-- or Razorpay-era orders table before the Dodo migration was applied.
-- Safe to run once in Supabase SQL Editor; it preserves historical rows.

-- Dodo checkout sessions do not have a final amount, receipt, or payment ID
-- until Dodo sends payment.succeeded. Those legacy fields cannot be required
-- during the initial checkout-session insert.
alter table public.orders
    alter column amount drop not null,
    alter column amount_paise drop not null,
    alter column receipt drop not null;

-- Upgrade the pre-existing subscription table to the Dodo lifecycle shape.
alter table public.subscriptions
    alter column client_id drop not null,
    add column if not exists provider text,
    add column if not exists provider_subscription_id text,
    add column if not exists provider_customer_id text,
    add column if not exists product_id text,
    add column if not exists started_at timestamptz,
    add column if not exists current_period_start timestamptz,
    add column if not exists current_period_end timestamptz,
    add column if not exists cancelled_at timestamptz,
    add column if not exists metadata jsonb not null default '{}'::jsonb,
    add column if not exists updated_at timestamptz not null default now();

-- PostgREST uses this column pair for its upsert conflict target. A UNIQUE
-- constraint permits legacy rows whose provider values are still NULL.
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'subscriptions_provider_subscription_id_key'
          and conrelid = 'public.subscriptions'::regclass
    ) then
        alter table public.subscriptions
            add constraint subscriptions_provider_subscription_id_key
            unique (provider, provider_subscription_id);
    end if;
end $$;

create index if not exists subscriptions_provider_subscription_id_idx
    on public.subscriptions(provider, provider_subscription_id);

-- New Google connections must belong to a valid client. NOT VALID protects
-- future writes without failing because of any historical orphaned record.
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'google_connections_client_id_fkey'
          and conrelid = 'public.google_connections'::regclass
    ) then
        alter table public.google_connections
            add constraint google_connections_client_id_fkey
            foreign key (client_id) references public.clients(id) on delete cascade not valid;
    end if;
end $$;

alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.dodo_webhook_events enable row level security;
alter table public.google_connections enable row level security;

comment on column public.google_connections.refresh_token is
    'Legacy plaintext token column. Do not write to it; use refresh_token_encrypted. Clear legacy values only after a backup and verification.';
