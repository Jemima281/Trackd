// Looks up genres for saved entries that don't have any yet (logged before
// genres were stored). Runs on our server: AniList in batches, TMDB and
// Open Library one item at a time, a few at once.

import { aniListQuery } from "@/lib/anilist";
import { normalizeGenres } from "@/lib/genres";

async function tmdbGenres(kind: "movie" | "tv", id: string) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) return [];
  const res = await fetch(`https://api.themoviedb.org/3/${kind}/${id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return normalizeGenres((json.genres ?? []).map((g: { name: string }) => g.name));
}

async function openLibraryGenres(id: string) {
  const res = await fetch(`https://openlibrary.org/works/${id}.json`);
  if (!res.ok) return [];
  const json = await res.json();
  const subjects: string[] = (json.subjects ?? []).filter(
    (s: string) => s.length <= 24 && !/\d|accessible|daisy|library|nyt:|large type/i.test(s),
  );
  return normalizeGenres(subjects).slice(0, 4);
}

export async function lookUpGenres(keys: string[]): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};

  const aniIds = keys.filter((k) => /^anilist:\d+$/.test(k)).map((k) => Number(k.split(":")[1]));
  if (aniIds.length) {
    try {
      const data = await aniListQuery<{ Page: { media: { id: number; genres: string[] }[] } }>(
        `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids) { id genres } } }`,
        { ids: aniIds.slice(0, 50) },
      );
      for (const m of data.Page.media) out[`anilist:${m.id}`] = normalizeGenres(m.genres);
    } catch (err) {
      console.error("AniList genre lookup failed:", err);
    }
  }

  const others = keys.filter((k) => /^(tmdb-movie|tmdb-tv):\d+$|^ol:OL\d+W$/.test(k)).slice(0, 25);
  let next = 0;
  async function worker() {
    while (next < others.length) {
      const key = others[next++];
      const [source, id] = key.split(":");
      try {
        out[key] =
          source === "ol"
            ? await openLibraryGenres(id)
            : await tmdbGenres(source === "tmdb-movie" ? "movie" : "tv", id);
      } catch (err) {
        console.error("Genre lookup failed:", key, err);
      }
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  return out;
}
