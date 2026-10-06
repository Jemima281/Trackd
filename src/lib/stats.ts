import { createClient } from "@/lib/supabase/client";
import type { MediaType } from "@/lib/search";

export type XpByType = Record<MediaType, number>;

const EMPTY: XpByType = { anime: 0, manga: 0, movie: 0, tv: 0, album: 0 };

// A user's XP per category and total hours, added up in the database.
export async function getStats(userId: string) {
  const { data, error } = await createClient().rpc("xp_by_type", { target: userId });
  if (error) throw error;
  const byType = { ...EMPTY };
  let xp = 0;
  let minutes = 0;
  for (const row of data as { media_type: MediaType; xp: number; minutes: number }[]) {
    byType[row.media_type] = Number(row.xp);
    xp += Number(row.xp);
    minutes += Number(row.minutes);
  }
  return { byType, xp, hours: Math.round(minutes / 60) };
}

export type Period = "all" | "week";

export type LeaderboardRow = { user_id: string; username: string; xp: number };

// You and your accepted friends, highest XP first.
export async function getLeaderboard(period: Period, category: MediaType | null) {
  const { data, error } = await createClient().rpc("leaderboard", { period, category });
  if (error) throw error;
  return (data as LeaderboardRow[]).map((r) => ({ ...r, xp: Number(r.xp) }));
}
