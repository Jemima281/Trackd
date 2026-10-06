-- Imports: mark entries that came from another app, so they don't flood the
-- activity feed or count as XP earned this week.
alter table public.entries add column via_import boolean not null default false;

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
