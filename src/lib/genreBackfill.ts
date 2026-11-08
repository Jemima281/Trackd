import type { Entry } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";

// Fills in genres for your entries that were logged before genres were
// saved. Runs quietly once per browser after the Dex loads.

const FLAG = "shuin-genres-backfilled-v1";

export async function backfillGenres(userId: string, entries: Entry[]): Promise<Entry[] | null> {
  try {
    if (localStorage.getItem(`${FLAG}:${userId}`)) return null;
  } catch {
    // Storage blocked: just run it.
  }
  const missing = entries.filter((e) => e.user_id === userId && e.genres.length === 0);
  if (missing.length === 0) return markDone(userId);

  const found: Record<string, string[]> = {};
  // AniList keys go 50 at a time; others 25 (they're looked up individually).
  const ani = missing.filter((e) => e.media_key.startsWith("anilist:"));
  const rest = missing.filter((e) => !e.media_key.startsWith("anilist:"));
  const batches = [
    ...chunk(ani, 50),
    ...chunk(rest, 25),
  ];
  for (const batch of batches) {
    const res = await fetch("/api/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: batch.map((e) => e.media_key) }),
    });
    if (!res.ok) return null; // try again next time
    Object.assign(found, (await res.json()).genres);
  }

  const supabase = createClient();
  const updated = new Map<string, string[]>();
  for (const e of missing) {
    const genres = found[e.media_key];
    if (!genres?.length) continue;
    const { error } = await supabase.from("entries").update({ genres }).eq("id", e.id);
    if (!error) updated.set(e.id, genres);
  }
  markDone(userId);
  return updated.size ? entries.map((e) => (updated.has(e.id) ? { ...e, genres: updated.get(e.id)! } : e)) : null;
}

function markDone(userId: string) {
  try {
    localStorage.setItem(`${FLAG}:${userId}`, String(Date.now()));
  } catch {}
  return null;
}

function chunk<T>(list: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
