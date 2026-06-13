
-- Credit plans (pricing tiers)
create table public.credit_plans (
  id          text primary key,
  name        text not null,
  credits     integer not null,
  price_cents integer not null,
  currency    text not null default 'usd',
  popular     boolean not null default false,
  created_at  timestamptz not null default now()
);

insert into public.credit_plans (id, name, credits, price_cents, popular) values
  ('starter',  'Starter',  100,  499,  false),
  ('pro',      'Pro',      500,  1999, true),
  ('ultra',    'Ultra',   2000,  5999, false);

-- User credit wallets
create table public.user_credits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  balance     integer not null default 0 check (balance >= 0),
  total_earned integer not null default 0,
  total_spent  integer not null default 0,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id)
);

-- Credit transactions ledger
create table public.credit_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  delta        integer not null,
  reason       text not null,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index idx_credit_txn_user on public.credit_transactions(user_id, created_at desc);

-- Orders (Stripe checkout)
create type public.order_status as enum ('pending','completed','cancelled','refunded');

create table public.orders (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id),
  plan_id                  text references public.credit_plans(id),
  credits                  integer not null,
  total_amount             integer not null,
  currency                 text not null default 'usd',
  status                   public.order_status not null default 'pending',
  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  customer_email           text,
  customer_name            text,
  completed_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_orders_user    on public.orders(user_id);
create index idx_orders_session on public.orders(stripe_session_id);
create index idx_orders_status  on public.orders(status);

-- RLS
alter table public.user_credits        enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.orders              enable row level security;
alter table public.credit_plans        enable row level security;

-- credit_plans: anyone can read
create policy "Anyone can read credit plans"
  on public.credit_plans for select using (true);

-- user_credits: user sees own
create policy "User reads own credits"
  on public.user_credits for select using (auth.uid() = user_id);

-- credit_transactions: user sees own
create policy "User reads own transactions"
  on public.credit_transactions for select using (auth.uid() = user_id);

-- orders: user sees own
create policy "User reads own orders"
  on public.orders for select using (auth.uid() = user_id);

-- Service role can do everything (edge functions)
create policy "Service role manages user_credits"
  on public.user_credits for all using (auth.jwt()->>'role' = 'service_role');
create policy "Service role manages credit_transactions"
  on public.credit_transactions for all using (auth.jwt()->>'role' = 'service_role');
create policy "Service role manages orders"
  on public.orders for all using (auth.jwt()->>'role' = 'service_role');
