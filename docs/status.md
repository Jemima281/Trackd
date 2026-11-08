# Shuin status

Formerly "Trackd". The GitHub repository and Vercel project still use the old name.

**Live app:** https://shuin.io (domain from Cloudflare, DNS-only CNAMEs to Vercel;
`www.shuin.io` redirects to it). The old https://trackd-two-wheat.vercel.app still works.
Every push to `main` goes live on Vercel within about a minute.

## What's built

- Accounts (sign up / log in) and profiles with usernames
- Search: anime + manga (AniList), movies + TV (TMDB)
- Logging: Planning / Watching / Dropped / Completed, 0.0–10.0 rating, progress
- Dex: search, sort (recent, rating, title, XP, year) and rating filters
- XP: 1 per minute spent + 50 for finishing
- Ranks: Bronze → Legend, overall and per category, with an emblem per tier
- Profiles: display name, bio, emoji avatar + colour, banner, top 4 favourites
- Password reset
- Friends: requests, public profiles (`/u/username`), leaderboard
  (this week / all time, per category), head-to-head (`/compare/username`)
- Activity feed on the home page
- Import from AniList, MyAnimeList, Letterboxd, IMDb
- Installable to a phone home screen

## Database setup

Each file in `supabase/migrations/` is pasted into Supabase → SQL Editor
→ Run, once, in order:

| File | Adds |
|---|---|
| 0001_profiles.sql | usernames |
| 0002_entries.sql | the Dex |
| 0003_xp.sql | XP and progress |
| 0004_friendships.sql | friends |
| 0005_leaderboard.sql | XP history, leaderboard, totals |
| 0006_activity.sql | activity feed |
| 0007_import.sql | importing |
| 0008_ratings_profiles.sql | removes music, 0.0–10.0 ratings, profile customisation |
| 0009_progress_caps.sql | limits on progress for ongoing series |

## Settings outside the code

- **Vercel → Environment Variables:** `TMDB_READ_TOKEN` (movie/TV search)
- **Supabase → Authentication → URL Configuration:** Site URL is https://shuin.io; redirect
  URLs include both shuin.io and the old Vercel address
- **Supabase → Authentication → Email:** "Confirm email" off while testing

## If pages say "Loading…" forever

Supabase pauses free projects after about a week with no activity. Open the
project on supabase.com and click **Restore project**; nothing is lost.

## Next up

See `docs/fix-later.md`.
