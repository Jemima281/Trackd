-- 1. New categories: manhwa (Korean comics) and books.
alter table public.entries drop constraint if exists entries_media_type_check;
alter table public.entries
  add constraint entries_media_type_check
  check (media_type in ('anime', 'manga', 'manhwa', 'movie', 'tv', 'book'));

-- 2. Genres, for statistics.
alter table public.entries
  add column genres text[] not null default '{}' check (cardinality(genres) <= 12);

-- 3. Friend groups. Rows are only read directly (members only); every change
--    goes through the functions below, which check permissions.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  emoji text check (char_length(emoji) <= 16),
  owner uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- Security definer so the policies below don't recurse into themselves.
create function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members where group_id = gid and user_id = auth.uid()
  );
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "Members can see their groups"
  on public.groups for select
  using (public.is_group_member(id));

create policy "Members can see who is in their groups"
  on public.group_members for select
  using (public.is_group_member(group_id));

create function public.create_group(group_name text, group_emoji text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if (select count(*) from public.groups where owner = auth.uid()) >= 20 then
    raise exception 'You can own at most 20 groups';
  end if;
  insert into public.groups (name, emoji, owner)
  values (trim(group_name), nullif(trim(group_emoji), ''), auth.uid())
  returning id into gid;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid());
  return gid;
end;
$$;

-- Any member can add one of their (accepted) friends.
create function public.add_group_member(gid uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_group_member(gid) then raise exception 'Not a member of this group'; end if;
  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = member)
        or (f.addressee = auth.uid() and f.requester = member))
  ) then
    raise exception 'You can only add your friends';
  end if;
  if (select count(*) from public.group_members where group_id = gid) >= 50 then
    raise exception 'Groups can have at most 50 members';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, member)
  on conflict do nothing;
end;
$$;

-- Before joining from an invite link: what group is this?
create function public.group_preview(code text)
returns table (id uuid, name text, emoji text, members bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.emoji, (select count(*) from public.group_members m where m.group_id = g.id)
  from public.groups g
  where g.invite_code = code;
$$;

create function public.join_group(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  select id into gid from public.groups where invite_code = code;
  if gid is null then raise exception 'That invite link is not valid'; end if;
  if (select count(*) from public.group_members where group_id = gid) >= 50 then
    raise exception 'This group is full';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end;
$$;

-- Leaving: if the owner leaves, the longest-standing member takes over;
-- the last one out deletes the group.
create function public.leave_group(gid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_owner uuid;
begin
  delete from public.group_members where group_id = gid and user_id = auth.uid();
  if (select owner from public.groups where id = gid) = auth.uid() then
    select user_id into next_owner from public.group_members
    where group_id = gid order by joined_at limit 1;
    if next_owner is null then
      delete from public.groups where id = gid;
    else
      update public.groups set owner = next_owner where id = gid;
    end if;
  end if;
end;
$$;

create function public.remove_group_member(gid uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select owner from public.groups where id = gid) is distinct from auth.uid() then
    raise exception 'Only the group owner can remove people';
  end if;
  if member = auth.uid() then raise exception 'Use leave instead'; end if;
  delete from public.group_members where group_id = gid and user_id = member;
end;
$$;

create function public.update_group(gid uuid, group_name text, group_emoji text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select owner from public.groups where id = gid) is distinct from auth.uid() then
    raise exception 'Only the group owner can edit the group';
  end if;
  update public.groups
  set name = trim(group_name), emoji = nullif(trim(group_emoji), '')
  where id = gid;
end;
$$;

create function public.delete_group(gid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select owner from public.groups where id = gid) is distinct from auth.uid() then
    raise exception 'Only the group owner can delete the group';
  end if;
  delete from public.groups where id = gid;
end;
$$;

-- Group members ranked by XP: all time, or since Monday (UTC); optionally one category.
create function public.group_leaderboard(gid uuid, period text default 'all', category text default null)
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
  select p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_color,
         greatest(coalesce(sum(x.xp), 0), 0)::bigint as xp
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
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
  where gm.group_id = gid and public.is_group_member(gid)
  group by p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_color
  order by xp desc, p.username;
$$;

-- 4. Statistics.

-- XP earned per month over the last 12 months.
create function public.xp_by_month(target uuid, category text default null)
returns table (month date, xp bigint)
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', ev.created_at)::date, sum(ev.delta)::bigint
  from public.xp_events ev
  where ev.user_id = target
    and (category is null or ev.media_type = category)
    and ev.created_at >= date_trunc('month', now()) - interval '11 months'
  group by 1
  order by 1;
$$;

-- Days with progress over the last year (for the heatmap and streaks).
create function public.activity_days(target uuid, category text default null)
returns table (day date, xp bigint)
language sql
stable
set search_path = ''
as $$
  select ev.created_at::date, sum(ev.delta)::bigint
  from public.xp_events ev
  where ev.user_id = target
    and (category is null or ev.media_type = category)
    and ev.created_at >= now() - interval '371 days'
  group by 1
  having sum(ev.delta) > 0
  order by 1;
$$;
