// Import from AniList (by username) and MyAnimeList (export file, matched to
// AniList by MAL id).

import { aniListQuery, aniListToMedia, MEDIA_FIELDS, type AniListMedia } from "@/lib/anilist";
import type { Status } from "@/lib/entries";
import { chunk, tidy, type ImportItem, type ImportResult, type OnProgress } from "@/lib/import/types";

type Kind = "anime" | "manga";

const ANILIST_STATUS: Record<string, Status> = {
  CURRENT: "in_progress",
  REPEATING: "completed",
  COMPLETED: "completed",
  PAUSED: "in_progress",
  DROPPED: "dropped",
  PLANNING: "planning",
};

type FuzzyDate = { year: number | null; month: number | null; day: number | null } | null;

function fuzzyToIso(d: FuzzyDate) {
  if (!d?.year) return null;
  const pad = (n: number | null) => String(n ?? 1).padStart(2, "0");
  return `${d.year}-${pad(d.month)}-${pad(d.day)}T12:00:00Z`;
}

const LIST_QUERY = `
query ($name: String, $type: MediaType) {
  MediaListCollection(userName: $name, type: $type) {
    lists {
      isCustomList
      entries {
        status
        score(format: POINT_10)
        progress
        completedAt { year month day }
        updatedAt
        media { ${MEDIA_FIELDS} }
      }
    }
  }
}`;

type ListEntry = {
  status: string;
  score: number;
  progress: number;
  completedAt: FuzzyDate;
  updatedAt: number;
  media: AniListMedia;
};

export async function importAniListUser(username: string, onProgress?: OnProgress) {
  const items: ImportItem[] = [];
  const kinds: Kind[] = ["anime", "manga"];
  for (const [i, kind] of kinds.entries()) {
    onProgress?.(i, kinds.length);
    let data;
    try {
      data = await aniListQuery<{
        MediaListCollection: { lists: { isCustomList: boolean; entries: ListEntry[] }[] };
      }>(LIST_QUERY, { name: username.trim(), type: kind.toUpperCase() });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) throw new Error(`No AniList user called "${username}".`);
      if (status === 403 || /private/i.test(String(err))) {
        throw new Error(`@${username}'s AniList is private. Make it public in AniList settings, then try again.`);
      }
      throw err;
    }
    const seen = new Set<number>();
    for (const list of data.MediaListCollection.lists) {
      if (list.isCustomList) continue; // custom lists repeat entries from the main lists
      for (const e of list.entries) {
        if (seen.has(e.media.id)) continue;
        seen.add(e.media.id);
        items.push(
          tidy({
            media: aniListToMedia(e.media, kind),
            status: ANILIST_STATUS[e.status] ?? "planning",
            rating: e.score || null,
            progress: e.progress ?? 0,
            date:
              fuzzyToIso(e.completedAt) ??
              (e.updatedAt ? new Date(e.updatedAt * 1000).toISOString() : null),
          }),
        );
      }
    }
  }
  onProgress?.(kinds.length, kinds.length);
  return { items, unmatched: [] } satisfies ImportResult;
}

// ---- MyAnimeList export file ----

const MAL_STATUS: Record<string, Status> = {
  completed: "completed",
  watching: "in_progress",
  reading: "in_progress",
  "on-hold": "in_progress",
  dropped: "dropped",
  "plan to watch": "planning",
  "plan to read": "planning",
  // Some exports use numbers.
  "1": "in_progress",
  "2": "completed",
  "3": "in_progress",
  "4": "dropped",
  "6": "planning",
};

type MalRow = {
  malId: number;
  title: string;
  status: Status;
  score: number;
  progress: number;
  date: string | null;
};

async function readMaybeGzip(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const gzipped = bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!gzipped) return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

export function parseMalXml(xml: string): { kind: Kind; rows: MalRow[] } {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("That doesn't look like a MyAnimeList export file.");
  const animeNodes = doc.getElementsByTagName("anime");
  const kind: Kind = animeNodes.length > 0 ? "anime" : "manga";
  const nodes = kind === "anime" ? animeNodes : doc.getElementsByTagName("manga");
  if (nodes.length === 0) throw new Error("No anime or manga found in that file.");

  const text = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
  const rows: MalRow[] = [];
  for (const el of Array.from(nodes)) {
    const malId = Number(text(el, kind === "anime" ? "series_animedb_id" : "manga_mangadb_id"));
    if (!malId) continue;
    const finish = text(el, "my_finish_date");
    rows.push({
      malId,
      title: text(el, kind === "anime" ? "series_title" : "manga_title"),
      status: MAL_STATUS[text(el, "my_status").toLowerCase()] ?? "planning",
      score: Number(text(el, "my_score")) || 0,
      progress: Number(text(el, kind === "anime" ? "my_watched_episodes" : "my_read_chapters")) || 0,
      date: /^\d{4}-\d{2}-\d{2}$/.test(finish) && !finish.startsWith("0000") ? `${finish}T12:00:00Z` : null,
    });
  }
  return { kind, rows };
}

const BY_MAL_QUERY = `
query ($ids: [Int], $type: MediaType) {
  Page(perPage: 50) {
    media(idMal_in: $ids, type: $type) { ${MEDIA_FIELDS} }
  }
}`;

export async function importMalFile(file: File, onProgress?: OnProgress) {
  const { kind, rows } = parseMalXml(await readMaybeGzip(file));
  const batches = chunk(rows, 50);
  const byMal = new Map<number, AniListMedia>();
  for (const [i, batch] of batches.entries()) {
    onProgress?.(i, batches.length);
    const data = await aniListQuery<{ Page: { media: AniListMedia[] } }>(BY_MAL_QUERY, {
      ids: batch.map((r) => r.malId),
      type: kind.toUpperCase(),
    });
    for (const m of data.Page.media) if (m.idMal) byMal.set(m.idMal, m);
  }
  onProgress?.(batches.length, batches.length);

  const items: ImportItem[] = [];
  const unmatched: string[] = [];
  for (const r of rows) {
    const media = byMal.get(r.malId);
    if (!media) {
      unmatched.push(r.title || `MAL #${r.malId}`);
      continue;
    }
    items.push(
      tidy({
        media: aniListToMedia(media, kind),
        status: r.status,
        rating: r.score || null,
        progress: r.progress,
        date: r.date,
      }),
    );
  }
  return { items, unmatched } satisfies ImportResult;
}
