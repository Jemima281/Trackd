-- 1. Music is gone: remove album entries and their XP history.
delete from public.entries where media_type = 'album';
delete from public.xp_events where media_type = 'album';
alter table public.entries drop constraint if exists entries_media_type_check;
alter table public.entries
  add constraint entries_media_type_check check (media_type in ('anime', 'manga', 'movie', 'tv'));

-- 2. Ratings are 0.0–10.0 in steps of 0.1.
alter table public.entries drop constraint if exists entries_rating_check;
alter table public.entries alter column rating type numeric(3, 1);
alter table public.entries add constraint entries_rating_check check (rating between 0 and 10);
alter table public.activity alter column rating type numeric(3, 1);

-- 3. Profile customisation.
alter table public.profiles
  add column display_name text check (char_length(display_name) <= 40),
  add column bio text check (char_length(bio) <= 160),
  add column avatar_emoji text check (char_length(avatar_emoji) <= 16),
  add column avatar_color text check (
    avatar_color in ('amber', 'orange', 'red', 'pink', 'violet', 'sky', 'teal', 'emerald', 'slate')
  ),
  add column banner text check (
    banner in ('sunset', 'ocean', 'forest', 'grape', 'gold', 'crimson', 'midnight', 'aurora')
  ),
  add column favorites text[] not null default '{}' check (cardinality(favorites) <= 4);

-- 4. Leaderboard and feed also return avatar details (and decimal ratings).
drop function public.leaderboard(text, text);
create function public.leaderboard(period text default 'all', category text default null)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  xp bigint
)
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
  select p.id, pr.username, pr.display_name, pr.avatar_emoji, pr.avatar_color,
         greatest(coalesce(sum(x.xp), 0), 0)::bigint as xp
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
  group by p.id, pr.username, pr.display_name, pr.avatar_emoji, pr.avatar_color
  order by xp desc, pr.username;
$$;

drop function public.feed(timestamptz, int);
create function public.feed(before timestamptz default now(), max_rows int default 30)
returns table (
  id bigint,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  media_key text,
  media_type text,
  title text,
  subtitle text,
  cover text,
  old_status text,
  status text,
  rating numeric,
  progress_delta int,
  progress int,
  total_units int,
  created_at timestamptz
)
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
  select a.id, pr.username, pr.display_name, pr.avatar_emoji, pr.avatar_color,
         e.media_key, e.media_type, e.title, e.subtitle, e.cover,
         a.old_status, a.status, a.rating, a.progress_delta, e.progress, e.total_units,
         a.created_at
  from public.activity a
  join people p on p.id = a.user_id
  join public.profiles pr on pr.id = a.user_id
  join public.entries e on e.id = a.entry_id
  where a.created_at < before
  order by a.created_at desc
  limit least(max_rows, 100);
$$;

-- 5. Re-create the entries triggers' functions so every database session
--    picks up the new rating type (old cached plans would otherwise error).
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_id bigint;
begin
  -- Imported entries don't appear in the feed (later edits to them do).
  if tg_op = 'INSERT' and new.via_import then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.rating is not distinct from old.rating
     and new.progress <= old.progress then
    return new; -- nothing worth showing
  end if;

  -- Several edits to the same entry within an hour become one feed item.
  select id into recent_id
  from public.activity
  where entry_id = new.id and created_at > now() - interval '1 hour'
  order by created_at desc
  limit 1;

  if recent_id is not null then
    update public.activity
    set status = new.status,
        rating = new.rating,
        progress_delta = progress_delta
          + greatest(new.progress - (case when tg_op = 'UPDATE' then old.progress else 0 end), 0),
        created_at = now()
    where id = recent_id;
  else
    insert into public.activity (entry_id, user_id, old_status, status, rating, progress_delta)
    values (
      new.id,
      new.user_id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      new.rating,
      greatest(new.progress - (case when tg_op = 'UPDATE' then old.progress else 0 end), 0)
    );
  end if;
  return new;
end;
$$;

create or replace function public.log_xp_change()
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
    -- Imported XP counts as earned when the other app says it was (never in
    -- the future), so imports don't top this week's leaderboard.
    insert into public.xp_events (user_id, media_type, delta, created_at)
    values (
      new.user_id,
      new.media_type,
      new.xp,
      case when new.via_import then least(new.updated_at, now()) else now() end
    );
  elsif tg_op = 'UPDATE' and new.xp <> old.xp then
    insert into public.xp_events (user_id, media_type, delta)
    values (new.user_id, new.media_type, new.xp - old.xp);
  end if;
  return new;
end;
$$;
