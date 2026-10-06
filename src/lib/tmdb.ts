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
