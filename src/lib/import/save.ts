import { chunk, type ImportItem, type OnProgress } from "@/lib/import/types";
import { createClient } from "@/lib/supabase/client";

// Imports without a date count as long ago, so they don't affect this week.
const UNKNOWN_DATE = "2000-01-01T00:00:00Z";

// Adds items to the Dex, skipping anything already there. Returns how many
// were actually added.
export async function saveImport(userId: string, items: ImportItem[], onProgress?: OnProgress) {
  const unique = [...new Map(items.map((i) => [i.media.key, i])).values()];
  const now = new Date().toISOString();
  const batches = chunk(unique, 100);
  let added = 0;
  for (const [i, batch] of batches.entries()) {
    onProgress?.(i, batches.length);
    const rows = batch.map((it) => {
      const date = it.date && it.date < now ? it.date : it.date ? now : UNKNOWN_DATE;
      return {
        user_id: userId,
        media_key: it.media.key,
        media_type: it.media.type,
        title: it.media.title,
        subtitle: it.media.subtitle,
        year: it.media.year,
        cover: it.media.cover,
        details: it.media.details,
        status: it.status,
        rating: it.rating,
        progress: it.progress,
        total_units: it.media.totalUnits ?? null,
        unit_minutes: it.media.unitMinutes ?? null,
        completed_at: it.status === "completed" && it.date ? date.slice(0, 10) : null,
        updated_at: date,
        via_import: true,
      };
    });
    const { data, error } = await createClient()
      .from("entries")
      .upsert(rows, { onConflict: "user_id,media_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    added += data?.length ?? 0;
  }
  onProgress?.(batches.length, batches.length);
  return added;
}
