-- Allow default_remind_days_before 1 and any value 1–365 (was 7, 14, 30 only). Default to 1.
alter table public.settings
  drop constraint if exists settings_default_remind_days_before_check;

alter table public.settings
  add constraint settings_default_remind_days_before_check
  check (default_remind_days_before >= 1 and default_remind_days_before <= 365);

alter table public.settings
  alter column default_remind_days_before set default 1;
