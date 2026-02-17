-- Morning brief notification time (HH:mm, 24h). When to send the daily brief.
alter table public.settings
  add column if not exists morning_brief_time text default '07:00';
