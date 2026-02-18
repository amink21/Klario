-- Allow 'completed' status on life_items (for finished-reminder check feature).
alter table public.life_items
  drop constraint if exists life_items_status_check;

alter table public.life_items
  add constraint life_items_status_check check (status in ('active', 'cancelled', 'completed'));
