// Looks up an item's length (for XP). Movies and TV need this because
// their search results don't include it. For AniList it fills in ongoing
// series, which have no official episode/chapter count. Runs on our server.

import { MANGA_MINUTES_PER_CHAPTER, MANHWA_MINUTES_PER_CHAPTER } from "@/lib/anilist";
import { minutesPerPage, MINUTES_PER_PAGE } from "@/lib/books";
import { capFromStartYear, MAX_UNKNOWN_UNITS } from "@/lib/xp";

export type Length = {
  totalUnits: number | null;
  unitMinutes: number | null;
  // When the total is unknown: the most episodes/chapters anyone could have
  // seen, so progress (and XP) can't be inflated.
  maxUnits?: number;
  // Still coming out: the total is "so far", so progress may go past it.
  ongoing?: boolean;
};

// Lower-case letters and digits only, so "Solo Leveling!" matches "solo leveling".
function simplify(title: string) {
  return title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

// Latest chapter from MangaUpdates, which tracks every release (MangaDex
// often has gaps where official translations were taken down). It has no
// AniList ids, so match on title + start year + comic type.
async function mangaUpdatesLatestChapter(titles: string[], startYear: number | null) {
  const wanted = new Set(titles.map(simplify));
  for (const title of titles) {
    const found = await getJson("https://api.mangaupdates.com/v1/series/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: title, perpage: 10 }),
    });
    const match = (found.results ?? []).find(
      (r: { hit_title?: string; record?: { title?: string; year?: string; type?: string } }) => {
        const rec = r.record ?? {};
        const year = Number(rec.year);
        return (
          ["Manga", "Manhwa", "Manhua"].includes(rec.type ?? "") &&
          (wanted.has(simplify(r.hit_title ?? "")) || wanted.has(simplify(rec.title ?? ""))) &&
          (!startYear || !year || Math.abs(year - startYear) <= 1)
        );
      },
    );
    if (!match) continue;
    const series = await getJson(`https://api.mangaupdates.com/v1/series/${match.record.series_id}`);
    return Math.floor(Number(series.latest_chapter)) || null;
  }
  return null;
}

// Latest chapter number for an ongoing manga, from MangaDex (which links its
// entries to AniList ids). Null if MangaDex doesn't have it.
async function mangaDexLatestChapter(aniListId: string, titles: string[]) {
  const headers = { "User-Agent": "Shuin/1.0 (https://shuin.io)" };
  for (const title of titles) {
    const params = new URLSearchParams({ title, limit: "10" });
    for (const r of ["safe", "suggestive", "erotica"]) params.append("contentRating[]", r);
    const found = await getJson(`https://api.mangadex.org/manga?${params}`, { headers });
    const match = (found.data ?? []).find(
      (m: { attributes?: { links?: { al?: string } } }) => m.attributes?.links?.al === aniListId,
    );
    if (!match) continue;
    const agg = await getJson(`https://api.mangadex.org/manga/${match.id}/aggregate`, { headers });
    let latest = 0;
    for (const vol of Object.values(agg.volumes ?? {}) as { chapters?: object }[]) {
      for (const ch of Object.values(vol.chapters ?? {}) as { chapter?: string }[]) {
        latest = Math.max(latest, Math.floor(Number(ch.chapter)) || 0);
      }
    }
    latest = Math.max(latest, Math.floor(Number(match.attributes?.lastChapter)) || 0);
    return latest || null;
  }
  return null;
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

async function tmdb(path: string) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("TMDB_READ_TOKEN is not set");
  return getJson(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
}

// A book with no page count in search: take the middle page count of its
// editions (ignoring box sets and pamphlets), and its reading pace from its
// subjects. If no edition lists pages, the reader enters theirs.
async function bookLength(id: string): Promise<Length> {
  const [work, editions] = await Promise.all([
    getJson(`https://openlibrary.org/works/${id}.json`).catch(() => ({})),
    getJson(`https://openlibrary.org/works/${id}/editions.json?limit=100`).catch(() => ({})),
  ]);
  const pages = ((editions.entries ?? []) as { number_of_pages?: number }[])
    .map((e) => e.number_of_pages ?? 0)
    .filter((n) => n >= 8 && n <= 3000)
    .sort((a, b) => a - b);
  const median = pages.length ? pages[Math.floor(pages.length / 2)] : null;
  return {
    totalUnits: median,
    unitMinutes: minutesPerPage(work.subjects ?? [], median) || MINUTES_PER_PAGE,
    maxUnits: MAX_UNKNOWN_UNITS,
  };
}

export async function lookUpLength(key: string): Promise<Length> {
  const [source, id] = key.split(":");
  if (source === "ol" && /^OL\d+W$/.test(id ?? "")) return bookLength(id);
  if (!id || !/^\d+$/.test(id)) throw new Error(`Bad key: ${key}`);

  switch (source) {
    case "tmdb-movie": {
      const movie = await tmdb(`/movie/${id}`);
      return { totalUnits: 1, unitMinutes: movie.runtime || 110 };
    }
    case "tmdb-tv": {
      const show = await tmdb(`/tv/${id}`);
      const runtime =
        show.episode_run_time?.[0] ?? show.last_episode_to_air?.runtime ?? 45;
      return { totalUnits: show.number_of_episodes || null, unitMinutes: runtime };
    }
    case "anilist": {
      const json = await getJson("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          query: `query ($id: Int) { Media(id: $id) {
            type format status episodes duration chapters nextAiringEpisode { episode }
            title { romaji english } startDate { year } countryOfOrigin
          } }`,
          variables: { id: Number(id) },
        }),
      });
      const m = json.data?.Media;
      if (!m) throw new Error(`AniList has no media ${id}`);
      const maxUnits = capFromStartYear(m.startDate?.year);
      if (m.type === "ANIME") {
        const total =
          m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null);
        return { totalUnits: total || null, unitMinutes: m.duration ?? 24, maxUnits };
      }
      let total: number | null = m.chapters ?? (m.format === "ONE_SHOT" ? 1 : null);
      // Ongoing series have no official count: ask both trackers for the
      // latest chapter and believe whichever is further along.
      const ongoing = !total;
      if (!total) {
        const titles = [...new Set([m.title?.english, m.title?.romaji].filter(Boolean))] as string[];
        const counts = await Promise.all([
          mangaUpdatesLatestChapter(titles, m.startDate?.year ?? null).catch((err) => {
            console.error("MangaUpdates lookup failed:", err);
            return null;
          }),
          mangaDexLatestChapter(id, titles).catch((err) => {
            console.error("MangaDex lookup failed:", err);
            return null;
          }),
        ]);
        total = Math.max(0, ...counts.map((n) => n ?? 0)) || null;
      }
      const minutes =
        m.countryOfOrigin === "KR" ? MANHWA_MINUTES_PER_CHAPTER : MANGA_MINUTES_PER_CHAPTER;
      return { totalUnits: total, unitMinutes: minutes, maxUnits, ongoing };
    }
    default:
      throw new Error(`No length lookup for ${source}`);
  }
}
