// Letterboxd and IMDb imports: read the export files in the browser, then
// match titles to TMDB through our /api/import/tmdb route.

import { unzipSync, strFromU8 } from "fflate";
import { parseCsv } from "@/lib/csv";
import type { Status } from "@/lib/entries";
import { chunk, tidy, type ImportItem, type ImportResult, type OnProgress } from "@/lib/import/types";
import type { MediaResult } from "@/lib/search";
import type { MatchRequest } from "@/lib/tmdb";

type Pending = {
  request: MatchRequest;
  label: string; // shown if we can't match it
  status: Status;
  rating: number | null;
  date: string | null;
};

// Read every CSV from the picked files, unzipping any .zip.
async function readCsvFiles(files: File[]) {
  const out: { name: string; rows: Record<string, string>[] }[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      const entries = unzipSync(bytes, { filter: (f) => f.name.toLowerCase().endsWith(".csv") });
      for (const [name, data] of Object.entries(entries)) {
        out.push({ name: name.toLowerCase(), rows: parseCsv(strFromU8(data)) });
      }
    } else {
      out.push({ name: file.name.toLowerCase(), rows: parseCsv(new TextDecoder().decode(bytes)) });
    }
  }
  return out;
}

async function matchAll(pending: Pending[], onProgress?: OnProgress): Promise<ImportResult> {
  const batches = chunk(pending, 25);
  const items: ImportItem[] = [];
  const unmatched: string[] = [];
  for (const [i, batch] of batches.entries()) {
    onProgress?.(i, batches.length);
    const res = await fetch("/api/import/tmdb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: batch.map((p) => p.request) }),
    });
    if (!res.ok) throw new Error(`Matching failed (${res.status}). Try again in a minute.`);
    const { results }: { results: (MediaResult | null)[] } = await res.json();
    batch.forEach((p, j) => {
      const media = results[j];
      if (!media) unmatched.push(p.label);
      else items.push(tidy({ media, status: p.status, rating: p.rating, progress: 0, date: p.date }));
    });
  }
  onProgress?.(batches.length, batches.length);
  return { items, unmatched };
}

function isoDate(d: string | undefined) {
  return d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(0, 10)}T12:00:00Z` : null;
}

// ---- Letterboxd: watched.csv, ratings.csv, watchlist.csv (zip or loose) ----

export async function importLetterboxd(files: File[], onProgress?: OnProgress) {
  const csvs = await readCsvFiles(files);
  const find = (name: string) => csvs.find((c) => c.name.split("/").pop() === name)?.rows ?? [];
  const watched = find("watched.csv");
  const ratings = find("ratings.csv");
  const watchlist = find("watchlist.csv");
  if (!watched.length && !ratings.length && !watchlist.length) {
    throw new Error("Couldn't find watched.csv, ratings.csv or watchlist.csv in those files.");
  }

  // Films are identified by their Letterboxd URL.
  const films = new Map<string, Pending>();
  const add = (row: Record<string, string>, status: Status) => {
    const key = row["Letterboxd URI"] || `${row.Name}|${row.Year}`;
    if (!row.Name || films.has(key)) return;
    films.set(key, {
      request: { title: row.Name, year: Number(row.Year) || null },
      label: `${row.Name}${row.Year ? ` (${row.Year})` : ""}`,
      status,
      rating: null,
      date: isoDate(row.Date),
    });
  };
  watched.forEach((r) => add(r, "completed"));
  ratings.forEach((r) => add(r, "completed"));
  watchlist.forEach((r) => add(r, "planning"));
  for (const r of ratings) {
    const film = films.get(r["Letterboxd URI"] || `${r.Name}|${r.Year}`);
    // Letterboxd uses 0.5–5 stars; we use 1–10.
    if (film && Number(r.Rating)) film.rating = Number(r.Rating) * 2;
  }
  return matchAll([...films.values()], onProgress);
}

// ---- IMDb: ratings.csv and/or watchlist.csv ----

const IMDB_TYPES: Record<string, "movie" | "tv"> = {
  movie: "movie",
  "tv movie": "movie",
  "tv special": "movie",
  short: "movie",
  video: "movie",
  tvmovie: "movie",
  tvspecial: "movie",
  tvshort: "movie",
  "tv series": "tv",
  "tv mini series": "tv",
  tvseries: "tv",
  tvminiseries: "tv",
};

export async function importImdb(files: File[], onProgress?: OnProgress) {
  const csvs = await readCsvFiles(files);
  const seen = new Set<string>();
  const pending: Pending[] = [];
  for (const { rows } of csvs) {
    for (const r of rows) {
      const id = r.Const;
      const type = IMDB_TYPES[(r["Title Type"] ?? "").toLowerCase()];
      if (!id?.startsWith("tt") || !type || seen.has(id)) continue; // skips episodes, games…
      seen.add(id);
      const rated = Number(r["Your Rating"]);
      pending.push({
        request: { imdb: id, runtime: Number(r["Runtime (mins)"]) || null },
        label: `${r.Title}${r.Year ? ` (${r.Year})` : ""}`,
        // Rated → you've seen it; on the watchlist → planning.
        status: rated ? "completed" : "planning",
        rating: rated || null,
        date: isoDate(r["Date Rated"] || r.Created),
      });
    }
  }
  if (!pending.length) throw new Error("No movies or shows found. Upload IMDb's ratings or watchlist CSV.");
  return matchAll(pending, onProgress);
}
