-- Klovio (Life App) – Supabase schema
-- Same pattern as Folion: RLS, user_id on every table, indexes.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- Life items (reminders, bills, one-off or recurring)
create table if not exists public.life_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  amount_cents integer,
  cadence text not null check (cadence in ('one_time', 'monthly', 'yearly')),
  next_due_iso date not null,
  due_time text,
  remind_days_before integer not null default 7 check (remind_days_before >= 0 and remind_days_before <= 365),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  notes text,
  notification_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_life_items_user_id on public.life_items(user_id);
create index if not exists idx_life_items_next_due_iso on public.life_items(next_due_iso);

alter table public.life_items enable row level security;

create policy "Users can manage own life items"
  on public.life_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Transactions (signed: positive = expense, negative = income)
create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount_cents integer not null,
  category text not null default 'Other',
  date_iso date not null,
  merchant text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date_iso on public.transactions(date_iso);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Subscriptions
create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount_cents integer not null check (amount_cents >= 0),
  cadence text not null check (cadence in ('monthly', 'yearly')),
  next_due_iso date not null,
  detected boolean not null default false,
  ai_meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;

create policy "Users can manage own subscriptions"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- App settings (one row per user, like Folion app_settings)
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  morning_brief boolean not null default true,
  due_item_reminders boolean not null default true,
  default_remind_days_before smallint not null default 7 check (default_remind_days_before in (7, 14, 30)),
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Users can manage own settings"
  on public.settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to refresh settings.updated_at
create or replace function set_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at
  before update on public.settings
  for each row execute procedure set_settings_updated_at();
