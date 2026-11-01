import { createClient } from "@/lib/supabase/client";
import { MEDIA_TYPES, type MediaType } from "@/lib/search";

export type XpByType = Record<MediaType, number>;

const EMPTY: XpByType = { anime: 0, manga: 0, movie: 0, tv: 0 };

// A user's XP per category and total hours, added up in the database.
export async function getStats(userId: string) {
  const { data, error } = await createClient().rpc("xp_by_type", { target: userId });
  if (error) throw error;
  const byType = { ...EMPTY };
  let xp = 0;
  let minutes = 0;
  for (const row of data as { media_type: MediaType; xp: number; minutes: number }[]) {
    if (!MEDIA_TYPES.includes(row.media_type)) continue; // e.g. old album entries
    byType[row.media_type] = Number(row.xp);
    xp += Number(row.xp);
    minutes += Number(row.minutes);
  }
  return { byType, xp, hours: Math.round(minutes / 60) };
}

export type Period = "all" | "week";

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  xp: number;
};

// You and your accepted friends, highest XP first.
export async function getLeaderboard(period: Period, category: MediaType | null) {
  const { data, error } = await createClient().rpc("leaderboard", { period, category });
  if (error) throw error;
  return (data as LeaderboardRow[]).map((r) => ({ ...r, xp: Number(r.xp) }));
}
