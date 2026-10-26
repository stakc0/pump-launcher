create extension if not exists pgcrypto;

create table if not exists public.pump_source_coins (
  source_mint text primary key,
  creator_wallet text,
  name text,
  ticker text,
  metadata_uri text,
  metadata jsonb not null default '{}'::jsonb,
  image_url text,
  quote_mint text,
  source_signature text,
  source_slot bigint,
  source_created_at timestamptz,
  status text not null default 'observed' check (status in ('observed','approved','queued','blocked','failed')),
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pump_redeployments (
  id uuid primary key default gen_random_uuid(),
  source_mint text not null references public.pump_source_coins(source_mint),
  replica_mint text unique,
  creator_wallet text,
  quote_mint text,
  creator_fee_bps integer,
  status text not null default 'queued' check (status in ('queued','building','submitted','confirmed','failed','cancelled')),
  tx_signature text unique,
  error text,
  attempts integer not null default 0,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pump_redeployments_source_once_idx on public.pump_redeployments(source_mint);

create table if not exists public.pump_pairs (
  mint text primary key,
  source_mint text references public.pump_source_coins(source_mint),
  quote_mint text,
  bonding_curve text,
  associated_bonding_curve text,
  pump_swap_pool text,
  migrated boolean not null default false,
  depth integer,
  first_seen_slot bigint,
  last_seen_slot bigint,
  updated_at timestamptz not null default now()
);

create table if not exists public.pump_events (
  id bigint generated always as identity primary key,
  signature text not null,
  event_index integer not null default 0,
  event_type text not null,
  mint text,
  source_mint text,
  slot bigint not null,
  block_time timestamptz,
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  unique(signature,event_index)
);
create index if not exists pump_events_slot_idx on public.pump_events(slot desc);
create index if not exists pump_events_mint_idx on public.pump_events(mint);

create table if not exists public.pump_fee_sweeps (
  id bigint generated always as identity primary key,
  mint text not null,
  stage text not null check (stage in ('bonding_curve','pumpswap')),
  quote_mint text,
  amount_raw numeric,
  tx_signature text unique,
  status text not null default 'pending' check (status in ('pending','submitted','confirmed','failed')),
  error text,
  swept_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pump_fee_sweeps_status_idx on public.pump_fee_sweeps(status,created_at);

create table if not exists public.pump_worker_cursors (
  worker_name text primary key,
  last_slot bigint,
  last_signature text,
  last_event_index integer,
  updated_at timestamptz not null default now()
);

alter table public.pump_source_coins enable row level security;
alter table public.pump_redeployments enable row level security;
alter table public.pump_pairs enable row level security;
alter table public.pump_events enable row level security;
alter table public.pump_fee_sweeps enable row level security;
alter table public.pump_worker_cursors enable row level security;
