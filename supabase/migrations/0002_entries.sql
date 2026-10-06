-- Entries: one row per item a user has logged (their Dex).
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  media_key text not null,
  media_type text not null check (media_type in ('anime', 'manga', 'movie', 'tv', 'album')),
  title text not null,
  subtitle text,
  year int,
  cover text,
  details text,
  status text not null check (status in ('planning', 'in_progress', 'dropped', 'completed')),
  rating smallint check (rating between 1 and 10),
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_key)
);

create index entries_user_id_idx on public.entries (user_id, updated_at desc);

alter table public.entries enable row level security;

-- Dexes are public, so friends can browse and compare them.
create policy "Entries are viewable by everyone"
  on public.entries for select
  using (true);

create policy "Users can add their own entries"
  on public.entries for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own entries"
  on public.entries for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own entries"
  on public.entries for delete
  using ((select auth.uid()) = user_id);
