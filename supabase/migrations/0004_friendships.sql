-- Friendships: a request from one user to another, which becomes a friendship
-- once accepted. One row per pair, whichever direction it was sent in.
create table public.friendships (
  requester uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- Stop A→B and B→A both existing.
create unique index friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

create index friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;

create policy "See your own friendships"
  on public.friendships for select
  using ((select auth.uid()) in (requester, addressee));

create policy "Send friend requests"
  on public.friendships for insert
  with check ((select auth.uid()) = requester and status = 'pending');

create policy "Accept requests sent to you"
  on public.friendships for update
  using ((select auth.uid()) = addressee)
  with check ((select auth.uid()) = addressee and status = 'accepted');

-- Covers declining, cancelling and unfriending.
create policy "Remove your own friendships"
  on public.friendships for delete
  using ((select auth.uid()) in (requester, addressee));
