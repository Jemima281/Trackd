-- XP history: one row every time an entry's XP changes, so we know *when* XP
-- was earned (for weekly leaderboards). Written only by the trigger below.
create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_type text not null,
  delta int not null,
  created_at timestamptz not null default now()
);

create index xp_events_user_time_idx on public.xp_events (user_id, created_at);

alter table public.xp_events enable row level security;

create policy "XP history is viewable by everyone"
  on public.xp_events for select
  using (true);

create function public.log_xp_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Skip when the whole account is being deleted.
    if old.xp <> 0 and exists (select 1 from public.profiles where id = old.user_id) then
      insert into public.xp_events (user_id, media_type, delta)
      values (old.user_id, old.media_type, -old.xp);
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' and new.xp <> 0 then
    insert into public.xp_events (user_id, media_type, delta)
    values (new.user_id, new.media_type, new.xp);
  elsif tg_op = 'UPDATE' and new.xp <> old.xp then
    insert into public.xp_events (user_id, media_type, delta)
    values (new.user_id, new.media_type, new.xp - old.xp);
  end if;
  return new;
end;
$$;

create trigger entries_log_xp
  after insert or update or delete on public.entries
  for each row execute function public.log_xp_change();

-- Existing entries count as earned when they were last updated.
insert into public.xp_events (user_id, media_type, delta, created_at)
select user_id, media_type, xp, updated_at from public.entries where xp <> 0;

-- A user's XP and time spent per category, added up by the database.
create function public.xp_by_type(target uuid)
returns table (media_type text, xp bigint, minutes numeric)
language sql
stable
set search_path = ''
as $$
  select e.media_type, sum(e.xp), sum(e.progress * coalesce(e.unit_minutes, 0))
  from public.entries e
  where e.user_id = target
  group by e.media_type;
$$;

-- You and your friends ranked by XP: all time, or since Monday (UTC).
-- Optionally for one category only.
create function public.leaderboard(period text default 'all', category text default null)
returns table (user_id uuid, username text, xp bigint)
language sql
stable
set search_path = ''
as $$
  with people as (
    select auth.uid() as id
    union
    select case when f.requester = auth.uid() then f.addressee else f.requester end
    from public.friendships f
    where f.status = 'accepted' and auth.uid() in (f.requester, f.addressee)
  )
  select p.id, pr.username, greatest(coalesce(sum(x.xp), 0), 0)::bigint as xp
  from people p
  join public.profiles pr on pr.id = p.id
  left join lateral (
    select e.xp
    from public.entries e
    where period = 'all'
      and e.user_id = p.id
      and (category is null or e.media_type = category)
    union all
    select ev.delta
    from public.xp_events ev
    where period = 'week'
      and ev.user_id = p.id
      and (category is null or ev.media_type = category)
      and ev.created_at >= date_trunc('week', now())
  ) x on true
  group by p.id, pr.username
  order by xp desc, pr.username;
$$;
