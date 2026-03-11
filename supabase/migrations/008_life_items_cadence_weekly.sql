-- Allow 'weekly' cadence on life_items (reminders/bills).
alter table public.life_items
  drop constraint if exists life_items_cadence_check;

alter table public.life_items
  add constraint life_items_cadence_check
  check (cadence in ('one_time', 'daily', 'weekly', 'monthly', 'yearly'));
