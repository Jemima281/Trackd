// Statistics for a user's Dex, overall or for one category.

import type { MediaType } from "@/lib/categories";
import type { Entry } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";

export type DayXp = { day: string; xp: number }; // day = "YYYY-MM-DD"
export type MonthXp = { month: string; xp: number }; // month = "YYYY-MM"

export async function getXpByMonth(userId: string, category: MediaType | null) {
  const { data, error } = await createClient().rpc("xp_by_month", { target: userId, category });
  if (error) throw error;
  return (data as { month: string; xp: number }[]).map((r) => ({
    month: String(r.month).slice(0, 7),
    xp: Number(r.xp),
  }));
}

export async function getActivityDays(userId: string, category: MediaType | null) {
  const { data, error } = await createClient().rpc("activity_days", { target: userId, category });
  if (error) throw error;
  return (data as { day: string; xp: number }[]).map((r) => ({
    day: String(r.day).slice(0, 10),
    xp: Number(r.xp),
  }));
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// The last 12 months, oldest first, with zero for months without XP.
export function fillMonths(rows: MonthXp[], now = new Date()): MonthXp[] {
  const byMonth = new Map(rows.map((r) => [r.month, r.xp]));
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const key = d.toISOString().slice(0, 7);
    return { month: key, xp: Math.max(0, byMonth.get(key) ?? 0) };
  });
}

// Consecutive days with XP. The current streak still counts if today hasn't
// had any activity yet but yesterday did.
export function streaks(days: DayXp[], now = new Date()) {
  const active = new Set(days.filter((d) => d.xp > 0).map((d) => d.day));
  const dayBefore = (iso: string) => isoDay(new Date(Date.parse(iso) - 86_400_000));

  let current = 0;
  let cursor = isoDay(now);
  if (!active.has(cursor)) cursor = dayBefore(cursor);
  while (active.has(cursor)) {
    current++;
    cursor = dayBefore(cursor);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of [...active].sort()) {
    run = prev && dayBefore(day) === prev ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  return { current, longest, activeDays: active.size };
}

function countBy<T>(items: T[], key: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function summarise(entries: Entry[]) {
  const started = entries.filter((e) => e.status !== "planning");
  const rated = entries.filter((e) => e.rating != null);
  const minutes = entries.reduce((sum, e) => sum + e.progress * (e.unit_minutes ?? 0), 0);

  // Score buckets 0–10: 8.6 counts as an 8; a perfect 10 has its own bar.
  const scores = Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: 0 }));
  for (const e of rated) scores[Math.min(10, Math.floor(e.rating!))].value++;

  // Per genre: how many titles and how much XP (a title counts towards each of its genres).
  const byGenre = new Map<string, { count: number; xp: number }>();
  for (const e of started) {
    for (const g of e.genres ?? []) {
      const cur = byGenre.get(g) ?? { count: 0, xp: 0 };
      byGenre.set(g, { count: cur.count + 1, xp: cur.xp + e.xp });
    }
  }
  const genres = [...byGenre.entries()]
    .map(([genre, v]) => ({ genre, ...v }))
    .sort((a, b) => b.xp - a.xp || b.count - a.count);

  const decades = countBy(started, (e) => (e.year ? `${Math.floor(e.year / 10) * 10}s` : null)).sort(
    (a, b) => a.label.localeCompare(b.label),
  );

  // Anime/TV format from the "TV · 24 episodes" style details line.
  const formats = countBy(started, (e) => e.details?.split(" · ")[0]).slice(0, 6);

  return {
    total: entries.length,
    completed: entries.filter((e) => e.status === "completed").length,
    inProgress: entries.filter((e) => e.status === "in_progress").length,
    planning: entries.filter((e) => e.status === "planning").length,
    dropped: entries.filter((e) => e.status === "dropped").length,
    units: entries.reduce((sum, e) => sum + (e.media_type === "movie" ? 0 : e.progress), 0),
    hours: minutes / 60,
    meanScore: rated.length ? rated.reduce((s, e) => s + e.rating!, 0) / rated.length : null,
    ratedCount: rated.length,
    scores,
    genres,
    decades,
    formats,
    topRated: [...rated].sort((a, b) => b.rating! - a.rating! || b.xp - a.xp).slice(0, 8),
    timeSinks: [...entries].filter((e) => e.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 5),
  };
}

// Short number: 1,284 · 12.9K · 1.2M
export function compact(n: number) {
  if (n < 10_000) return Math.round(n).toLocaleString();
  // Drop a trailing ".0" so 10,000 reads "10K", not "10.0K".
  const trim = (s: string) => s.replace(/\.0$/, "");
  if (n < 1_000_000) return `${trim((n / 1000).toFixed(n < 100_000 ? 1 : 0))}K`;
  return `${trim((n / 1_000_000).toFixed(1))}M`;
}
