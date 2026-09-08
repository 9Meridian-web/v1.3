-- 9 Meridian onboarding completion support.
-- Run this migration in Supabase SQL Editor before using
-- POST /api/onboarding/complete.

-- The existing backend expects these optional business-profile fields.
alter table if exists public.business_settings
    add column if not exists address text,
    add column if not exists email text,
    add column if not exists phone text,
    add column if not exists business_description text;

-- One business-settings row per client.
create unique index if not exists business_settings_client_id_uidx
    on public.business_settings(client_id);

-- Services are first-class data because the receptionist uses them for
-- service questions, booking, availability and pricing.
create table if not exists public.services (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    name text not null,
    description text,
    category text,
    duration_minutes integer not null default 30,
    price numeric(12,2) not null default 0,
    currency varchar(3) not null default 'INR',
    color text,
    online_booking boolean not null default true,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint services_duration_positive check (duration_minutes > 0),
    constraint services_price_nonnegative check (price >= 0)
);

create index if not exists services_client_id_idx on public.services(client_id);
create unique index if not exists services_client_name_uidx
    on public.services(client_id, lower(name));

-- Keep the current agent repository/type compatible with the actual table.
alter table if exists public.agents
    add column if not exists agent_name text,
    add column if not exists business_name text,
    add column if not exists prompt text,
    add column if not exists language text default 'en',
    add column if not exists timezone text default 'Asia/Kolkata',
    add column if not exists voice_provider text default 'none',
    add column if not exists voice_id text,
    add column if not exists booking_enabled boolean not null default true;

-- Stores the rest of the onboarding form without forcing every preference
-- into a separate column. The actual operational data remains normalized in
-- clients, business_settings and services.
create table if not exists public.agent_settings (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null unique references public.clients(id) on delete cascade,
    configuration jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists agent_settings_client_id_idx
    on public.agent_settings(client_id);

-- GoogleRepository.upsert() uses client_id as its conflict target.
create unique index if not exists google_connections_client_id_uidx
    on public.google_connections(client_id);
