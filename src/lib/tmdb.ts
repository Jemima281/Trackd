// Movie and TV search via TMDB, run on our server so the read token
// (TMDB_READ_TOKEN, set in Vercel) never reaches the browser.

import type { MediaResult } from "@/lib/search";

type TmdbMovie = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
};

type TmdbShow = {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  poster_path?: string | null;
};

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
  return type === "movie"
    ? fromTmdbMovies(json.results ?? [])
    : fromTmdbShows(json.results ?? []);
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

async function movieWithLength(id: number, fallbackRuntime?: number | null) {
  const m: MovieDetails | null = await tmdbGet(`/movie/${id}`);
  if (!m) return null;
  return {
    ...fromTmdbMovies([m])[0],
    totalUnits: 1,
    unitMinutes: m.runtime || fallbackRuntime || 110,
  };
}

async function showWithLength(id: number) {
  const s: ShowDetails | null = await tmdbGet(`/tv/${id}`);
  if (!s) return null;
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
