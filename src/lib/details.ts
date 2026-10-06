// Looks up an item's length (for XP). Movies, TV and albums need this because
// their search results don't include it; AniList is here for entries saved
// before lengths were stored. Runs on our server.

import { MANGA_MINUTES_PER_CHAPTER } from "@/lib/search";

export type Length = { totalUnits: number | null; unitMinutes: number | null };

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
    case "deezer": {
      const album = await getJson(`https://api.deezer.com/album/${id}`);
      if (album.error) throw new Error(`Deezer error: ${JSON.stringify(album.error)}`);
      const tracks = album.nb_tracks || null;
      return {
        totalUnits: tracks,
        unitMinutes: tracks && album.duration ? album.duration / 60 / tracks : 3.5,
      };
    }
    case "itunes": {
      const json = await getJson(`https://itunes.apple.com/lookup?entity=song&id=${id}`);
      const songs = (json.results ?? []).filter(
        (r: { wrapperType: string }) => r.wrapperType === "track",
      );
      const ms = songs.reduce(
        (sum: number, s: { trackTimeMillis?: number }) => sum + (s.trackTimeMillis ?? 0),
        0,
      );
      return {
        totalUnits: songs.length || null,
        unitMinutes: songs.length && ms ? ms / 60000 / songs.length : 3.5,
      };
    }
    case "anilist": {
      const json = await getJson("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          query: `query ($id: Int) { Media(id: $id) {
            type format episodes duration chapters nextAiringEpisode { episode }
          } }`,
          variables: { id: Number(id) },
        }),
      });
      const m = json.data?.Media;
      if (!m) throw new Error(`AniList has no media ${id}`);
      if (m.type === "ANIME") {
        return {
          totalUnits:
            m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null),
          unitMinutes: m.duration ?? 24,
        };
      }
      return {
        totalUnits: m.chapters ?? (m.format === "ONE_SHOT" ? 1 : null),
        unitMinutes: MANGA_MINUTES_PER_CHAPTER,
      };
    }
    default:
      throw new Error(`No length lookup for ${source}`);
  }
}
