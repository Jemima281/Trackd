-- 1. Profile pictures, stored in a public "avatars" bucket. Each user can
--    only write inside their own folder (named after their user id).
alter table public.profiles
  add column avatar_url text check (avatar_url is null or (avatar_url like 'https://%' and char_length(avatar_url) < 500));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Avatar images are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users replace their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create index entries_genres_idx on public.entries using gin (genres);

-- 2. Leaderboards return the profile picture and can rank by genre.
--    Genre rankings are all-time (XP history doesn't record genres).
drop function public.leaderboard(text, text);
create function public.leaderboard(period text default 'all', category text default null, genre text default null)
returns table (user_id uuid, username text, display_name text, avatar_url text, xp bigint)
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
  select p.id, pr.username, pr.display_name, pr.avatar_url,
         greatest(coalesce(sum(x.xp), 0), 0)::bigint as xp
  from people p
  join public.profiles pr on pr.id = p.id
  left join lateral (
    select e.xp
    from public.entries e
    where (period = 'all' or genre is not null)
      and e.user_id = p.id
      and (category is null or e.media_type = category)
      and (genre is null or e.genres @> array[genre])
    union all
    select ev.delta
    from public.xp_events ev
    where period = 'week' and genre is null
      and ev.user_id = p.id
      and (category is null or ev.media_type = category)
      and ev.created_at >= date_trunc('week', now())
  ) x on true
  group by p.id, pr.username, pr.display_name, pr.avatar_url
  order by xp desc, pr.username;
$$;

drop function public.group_leaderboard(uuid, text, text);
create function public.group_leaderboard(gid uuid, period text default 'all', category text default null, genre text default null)
returns table (user_id uuid, username text, display_name text, avatar_url text, xp bigint)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
         greatest(coalesce(sum(x.xp), 0), 0)::bigint as xp
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  left join lateral (
    select e.xp
    from public.entries e
    where (period = 'all' or genre is not null)
      and e.user_id = p.id
      and (category is null or e.media_type = category)
      and (genre is null or e.genres @> array[genre])
    union all
    select ev.delta
    from public.xp_events ev
    where period = 'week' and genre is null
      and ev.user_id = p.id
      and (category is null or ev.media_type = category)
      and ev.created_at >= date_trunc('week', now())
  ) x on true
  where gm.group_id = gid and public.is_group_member(gid)
  group by p.id, p.username, p.display_name, p.avatar_url
  order by xp desc, p.username;
$$;

drop function public.feed(timestamptz, int);
create function public.feed(before timestamptz default now(), max_rows int default 30)
returns table (
  id bigint,
  username text,
  display_name text,
  avatar_url text,
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
  select a.id, pr.username, pr.display_name, pr.avatar_url,
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
