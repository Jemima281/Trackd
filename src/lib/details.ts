// Looks up an item's length (for XP). Movies and TV need this because
// their search results don't include it. For AniList it fills in ongoing
// series, which have no official episode/chapter count. Runs on our server.

import { MANGA_MINUTES_PER_CHAPTER } from "@/lib/anilist";
import { capFromStartYear } from "@/lib/xp";

export type Length = {
  totalUnits: number | null;
  unitMinutes: number | null;
  // When the total is unknown: the most episodes/chapters anyone could have
  // seen, so progress (and XP) can't be inflated.
  maxUnits?: number;
};

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

export async function lookUpLength(key: string): Promise<Length> {
  const [source, id] = key.split(":");
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
            type format episodes duration chapters nextAiringEpisode { episode }
            title { romaji english } startDate { year }
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
      if (!total) {
        const titles = [...new Set([m.title?.english, m.title?.romaji].filter(Boolean))];
        total = await mangaDexLatestChapter(id, titles).catch((err) => {
          console.error("MangaDex lookup failed:", err);
          return null;
        });
      }
      return { totalUnits: total, unitMinutes: MANGA_MINUTES_PER_CHAPTER, maxUnits };
    }
    default:
      throw new Error(`No length lookup for ${source}`);
  }
}
