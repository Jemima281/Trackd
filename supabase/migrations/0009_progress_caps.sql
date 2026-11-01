-- Stop inflated progress on ongoing series (no official total).

-- Fix existing entries first, so the new rules can be added.
update public.entries
set progress = 2500
where total_units is null and progress > 2500;

update public.entries
set progress = floor(100000 / unit_minutes)::int
where unit_minutes is not null and progress * unit_minutes > 100000;

-- Without a known total, at most 2500 episodes/chapters.
alter table public.entries
  add constraint progress_cap_without_total check (total_units is not null or progress <= 2500);

-- No single entry can be worth more than 100,000 minutes (~1,700 hours).
alter table public.entries
  add constraint time_cap check (progress * coalesce(unit_minutes, 0) <= 100000);
