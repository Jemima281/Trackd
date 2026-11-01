# Trackd status

**Live app:** https://trackd-two-wheat.vercel.app
Every push to `main` goes live on Vercel within about a minute.

## What's built

- Accounts (sign up / log in) and profiles with usernames
- Search: anime + manga (AniList), movies + TV (TMDB), albums (Deezer)
- Logging: Planning / Watching / Dropped / Completed, 1–10 rating, progress
- XP: 1 per minute spent + 50 for finishing
- Ranks: Bronze → Legend, overall and per category
- Friends: requests, public profiles (`/u/username`), leaderboard
  (this week / all time, per category), head-to-head (`/compare/username`)
- Activity feed on the home page
- Import from AniList, MyAnimeList, Letterboxd, IMDb
- Installable to a phone home screen

## Database setup

Each file in `supabase/migrations/` is pasted into Supabase → SQL Editor
→ Run, once, in order. All seven have been handed over:

| File | Adds |
|---|---|
| 0001_profiles.sql | usernames |
| 0002_entries.sql | the Dex |
| 0003_xp.sql | XP and progress |
| 0004_friendships.sql | friends |
| 0005_leaderboard.sql | XP history, leaderboard, totals |
| 0006_activity.sql | activity feed |
| 0007_import.sql | importing |

## Settings outside the code

- **Vercel → Environment Variables:** `TMDB_READ_TOKEN` (movie/TV search)
- **Supabase → Authentication → URL Configuration:** Site URL is the live app
- **Supabase → Authentication → Email:** "Confirm email" off while testing

## Next up

See `docs/fix-later.md`.
