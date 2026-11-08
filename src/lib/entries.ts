import { createClient } from "@/lib/supabase/client";
import { CATEGORY, MEDIA_TYPES, type MediaType } from "@/lib/categories";
import { normalizeGenres } from "@/lib/genres";
import type { MediaResult } from "@/lib/search";

export type Status = "planning" | "in_progress" | "dropped" | "completed";

export const STATUSES: Status[] = ["planning", "in_progress", "dropped", "completed"];

export type Entry = {
  id: string;
  user_id: string;
  media_key: string;
  media_type: MediaType;
  title: string;
  subtitle: string | null;
  year: number | null;
  cover: string | null;
  details: string | null;
  status: Status;
  rating: number | null;
  completed_at: string | null;
  progress: number;
  total_units: number | null;
  unit_minutes: number | null;
  xp: number;
  genres: string[];
  created_at: string;
  updated_at: string;
};


export function statusLabel(status: Status, type: MediaType) {
  switch (status) {
    case "planning":
      return "Planning";
    case "in_progress":
      return CATEGORY[type].doing;
    case "dropped":
      return "Dropped";
    case "completed":
      return "Completed";
  }
}

export const STATUS_STYLES: Record<Status, { badge: string; button: string }> = {
  planning: { badge: "bg-sky-400 text-black", button: "border-sky-400 bg-sky-400/15 text-sky-300" },
  in_progress: { badge: "bg-amber-400 text-black", button: "border-amber-400 bg-amber-400/15 text-amber-300" },
  dropped: { badge: "bg-red-400 text-black", button: "border-red-400 bg-red-400/15 text-red-300" },
  completed: { badge: "bg-emerald-400 text-black", button: "border-emerald-400 bg-emerald-400/15 text-emerald-300" },
};

// numeric columns can arrive as strings; normalise once here.
function normalise(e: Entry): Entry {
  return { ...e, rating: e.rating == null ? null : Number(e.rating), genres: normalizeGenres(e.genres) };
}

export function entryToMedia(e: Entry): MediaResult {
  return {
    key: e.media_key,
    type: e.media_type,
    title: e.title,
    subtitle: e.subtitle,
    year: e.year,
    cover: e.cover,
    details: e.details,
    // Entries logged before XP existed have no length yet; undefined makes the
    // log sheet look it up.
    totalUnits: e.unit_minutes === null ? undefined : e.total_units,
    unitMinutes: e.unit_minutes ?? undefined,
    genres: e.genres ?? [],
  };
}

// Which of these media items has the user already logged?
export async function getEntriesFor(userId: string, keys: string[]) {
  if (keys.length === 0) return [];
  const { data, error } = await createClient()
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .in("media_key", keys);
  if (error) throw error;
  return (data as Entry[]).map(normalise);
}

export async function listEntries(userId: string) {
  const { data, error } = await createClient()
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .in("media_type", MEDIA_TYPES)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Entry[]).map(normalise);
}

export async function saveEntry(
  userId: string,
  media: MediaResult,
  status: Status,
  rating: number | null,
  progress: number,
  previous: Entry | null,
) {
  // Stamp the completion date the first time something is completed.
  const completedAt =
    status !== "completed"
      ? null
      : (previous?.completed_at ?? new Date().toISOString().slice(0, 10));

  const { data, error } = await createClient()
    .from("entries")
    .upsert(
      {
        user_id: userId,
        media_key: media.key,
        media_type: media.type,
        title: media.title,
        subtitle: media.subtitle,
        year: media.year,
        cover: media.cover,
        details: media.details,
        status,
        rating,
        progress,
        total_units: media.totalUnits ?? null,
        unit_minutes: media.unitMinutes ?? null,
        // Keep genres we already have if this source didn't send any.
        genres: normalizeGenres(media.genres?.length ? media.genres : previous?.genres),
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,media_key" },
    )
    .select()
    .single();
  if (error) throw error;
  return normalise(data as Entry);
}

export async function deleteEntry(id: string) {
  const { error } = await createClient().from("entries").delete().eq("id", id);
  if (error) throw error;
}
