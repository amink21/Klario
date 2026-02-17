-- Add has_seeded to settings (one-time demo seed flag per user)
alter table public.settings
  add column if not exists has_seeded boolean not null default false;
