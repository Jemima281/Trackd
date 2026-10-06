-- Activity: what people did with their entries, for the friends feed.
-- Written only by the trigger below.
create table public.activity (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  old_status text,
  status text not null,
  rating smallint,
  progress_delta int not null default 0,
  created_at timestamptz not null default now()
);

create index activity_user_time_idx on public.activity (user_id, created_at desc);
create index activity_entry_idx on public.activity (entry_id, created_at desc);

alter table public.activity enable row level security;

create policy "Activity is viewable by everyone"
  on public.activity for select
  using (true);

create function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_id bigint;
begin
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

create trigger entries_log_activity
  after insert or update on public.entries
  for each row execute function public.log_activity();

-- Recent activity from you and your accepted friends, newest first.
create function public.feed(before timestamptz default now(), max_rows int default 30)
returns table (
  id bigint,
  username text,
  media_key text,
  media_type text,
  title text,
  subtitle text,
  cover text,
  old_status text,
  status text,
  rating smallint,
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
  select a.id, pr.username, e.media_key, e.media_type, e.title, e.subtitle, e.cover,
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
