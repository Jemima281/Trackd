-- XP: progress through each entry and how long each unit takes.
alter table public.entries
  add column progress int not null default 0 check (progress between 0 and 20000),
  add column total_units int check (total_units between 1 and 20000),
  add column unit_minutes numeric check (unit_minutes > 0 and unit_minutes <= 400);

alter table public.entries
  add constraint progress_within_total check (total_units is null or progress <= total_units);

-- 1 XP per minute spent, plus 50 for finishing. Computed by the database so
-- nobody can just write themselves a big number.
alter table public.entries
  add column xp int generated always as (
    round(progress * coalesce(unit_minutes, 0))::int
    + case when status = 'completed' then 50 else 0 end
  ) stored;
