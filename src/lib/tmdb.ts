// Movie and TV search via TMDB, run on our server so the read token
// (TMDB_READ_TOKEN, set in Vercel) never reaches the browser.

import { aniListQuery, aniListToMedia, MEDIA_FIELDS, type AniListMedia } from "@/lib/anilist";
import { normalizeGenres } from "@/lib/genres";
import type { MediaResult } from "@/lib/search";

type TmdbBase = {
  original_language?: string;
  genre_ids?: number[]; // in search results
  genres?: { id: number; name: string }[]; // in detail responses
};

type TmdbMovie = TmdbBase & {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
};

type TmdbShow = TmdbBase & {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  poster_path?: string | null;
};

// TMDB's genre ids (movies and TV share most of them).
const GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

const ANIMATION = 16;

function genreIds(item: TmdbBase) {
  return item.genre_ids ?? item.genres?.map((g) => g.id) ?? [];
}

function genreNames(item: TmdbBase) {
  return normalizeGenres(genreIds(item).map((id) => GENRES[id]));
}

// Japanese animation is anime: it lives in the Anime category (via AniList),
// so it's left out of Movies/TV to avoid counting the same thing twice.
export function isAnime(item: TmdbBase) {
  return item.original_language === "ja" && genreIds(item).includes(ANIMATION);
}

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

function year(date?: string) {
  return date ? Number(date.slice(0, 4)) || null : null;
}

export function fromTmdbMovies(movies: TmdbMovie[]): MediaResult[] {
  return movies.map((m) => ({
    key: `tmdb-movie:${m.id}`,
    type: "movie",
    title: m.title,
    subtitle: m.original_title && m.original_title !== m.title ? m.original_title : null,
    year: year(m.release_date),
    cover: m.poster_path ? POSTER_BASE + m.poster_path : null,
    details: "Movie",
    genres: genreNames(m),
  }));
}

export function fromTmdbShows(shows: TmdbShow[]): MediaResult[] {
  return shows.map((s) => ({
    key: `tmdb-tv:${s.id}`,
    type: "tv",
    title: s.name,
    subtitle: s.original_name && s.original_name !== s.name ? s.original_name : null,
    year: year(s.first_air_date),
    cover: s.poster_path ? POSTER_BASE + s.poster_path : null,
    details: "TV series",
    genres: genreNames(s),
  }));
}

export async function searchTmdb(type: "movie" | "tv", query: string) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("TMDB_READ_TOKEN is not set");

  const res = await fetch(
    `https://api.themoviedb.org/3/search/${type}?include_adult=false&query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`TMDB returned ${res.status}`);
  const json = await res.json();
  const results = ((json.results ?? []) as TmdbBase[]).filter((r) => !isAnime(r));
  return type === "movie"
    ? fromTmdbMovies(results as TmdbMovie[])
    : fromTmdbShows(results as TmdbShow[]);
}

// ---- Matching imported titles to TMDB (used by /api/import/tmdb) ----

async function tmdbGet(path: string) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("TMDB_READ_TOKEN is not set");
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TMDB returned ${res.status}`);
  return res.json();
}

type MovieDetails = TmdbMovie & { runtime?: number | null };
type ShowDetails = TmdbShow & {
  number_of_episodes?: number | null;
  episode_run_time?: number[];
  last_episode_to_air?: { runtime?: number | null } | null;
};

const ANIME_BY_TITLE = `
query ($search: String, $formats: [MediaFormat]) {
  Page(perPage: 6) {
    media(search: $search, type: ANIME, format_in: $formats, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      ${MEDIA_FIELDS}
    }
  }
}`;

// The AniList entry for an anime film/series found on TMDB, so imports from
// Letterboxd/IMDb land in the same place as AniList/MAL imports.
async function animeFromAniList(
  titles: (string | undefined)[],
  year: number | null,
  formats: string[],
): Promise<MediaResult | null> {
  for (const title of [...new Set(titles.filter(Boolean))] as string[]) {
    try {
      const data = await aniListQuery<{ Page: { media: AniListMedia[] } }>(ANIME_BY_TITLE, {
        search: title,
        formats,
      });
      const media = data.Page.media;
      const best =
        media.find((m) => year && m.startDate?.year && Math.abs(m.startDate.year - year) <= 1) ??
        media[0];
      if (best) return aniListToMedia(best, "anime");
    } catch (err) {
      console.error("AniList lookup for anime failed:", title, err);
    }
  }
  return null;
}

async function movieWithLength(id: number, fallbackRuntime?: number | null) {
  const m: MovieDetails | null = await tmdbGet(`/movie/${id}`);
  if (!m) return null;
  if (isAnime(m)) {
    const anime = await animeFromAniList(
      [m.original_title, m.title],
      year(m.release_date),
      ["MOVIE", "SPECIAL", "OVA", "ONA"],
    );
    if (anime) return anime;
  }
  return {
    ...fromTmdbMovies([m])[0],
    totalUnits: 1,
    unitMinutes: m.runtime || fallbackRuntime || 110,
  };
}

async function showWithLength(id: number) {
  const s: ShowDetails | null = await tmdbGet(`/tv/${id}`);
  if (!s) return null;
  if (isAnime(s)) {
    const anime = await animeFromAniList(
      [s.original_name, s.name],
      year(s.first_air_date),
      ["TV", "TV_SHORT", "ONA"],
    );
    if (anime) return anime;
  }
  return {
    ...fromTmdbShows([s])[0],
    totalUnits: s.number_of_episodes || null,
    unitMinutes: s.episode_run_time?.[0] ?? s.last_episode_to_air?.runtime ?? 45,
  };
}

export type MatchRequest =
  | { title: string; year?: number | null } // movie by title (Letterboxd)
  | { imdb: string; runtime?: number | null }; // movie or show by IMDb id

export async function matchOne(req: MatchRequest): Promise<MediaResult | null> {
  if ("imdb" in req) {
    if (!/^tt\d+$/.test(req.imdb)) return null;
    const found = await tmdbGet(`/find/${req.imdb}?external_source=imdb_id`);
    const movie = found?.movie_results?.[0];
    if (movie) return movieWithLength(movie.id, req.runtime);
    const show = found?.tv_results?.[0];
    if (show) return showWithLength(show.id);
    return null;
  }
  const q = encodeURIComponent(req.title);
  let found = await tmdbGet(
    `/search/movie?include_adult=false&query=${q}${req.year ? `&year=${req.year}` : ""}`,
  );
  // Release years sometimes differ by country; retry without the year.
  if (!found?.results?.length && req.year) {
    found = await tmdbGet(`/search/movie?include_adult=false&query=${q}`);
  }
  const first = found?.results?.[0];
  return first ? movieWithLength(first.id) : null;
}

// Match a batch, a few at a time so we stay under TMDB's rate limit.
export async function matchMany(requests: MatchRequest[]) {
  const results: (MediaResult | null)[] = new Array(requests.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < requests.length) {
      const i = next++;
      try {
        results[i] = await matchOne(requests[i]);
      } catch (err) {
        console.error("TMDB match failed:", requests[i], err);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  return results;
}
