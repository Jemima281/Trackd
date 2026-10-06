import type { Status } from "@/lib/entries";
import type { MediaType } from "@/lib/search";

// XP = 1 per minute spent, plus a bonus for finishing.
// Keep in sync with the generated `xp` column in supabase/migrations/0003_xp.sql.
export const COMPLETION_BONUS = 50;

export function xpFor(status: Status, progress: number, unitMinutes: number | null) {
  return (
    Math.round(progress * (unitMinutes ?? 0)) + (status === "completed" ? COMPLETION_BONUS : 0)
  );
}

export const UNIT_NAMES: Record<MediaType, string> = {
  anime: "episodes",
  tv: "episodes",
  manga: "chapters",
  album: "tracks",
  movie: "movie",
};

export function totals(entries: { xp: number; progress: number; unit_minutes: number | null }[]) {
  let xp = 0;
  let minutes = 0;
  for (const e of entries) {
    xp += e.xp;
    minutes += e.progress * (e.unit_minutes ?? 0);
  }
  return { xp, hours: Math.round(minutes / 60) };
}
