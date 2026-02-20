-- Smart nudges setting: contextual notifications (spending, statement, positive). Default on.
alter table public.settings
  add column if not exists smart_nudges boolean not null default true;
