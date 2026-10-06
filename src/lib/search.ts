// Searches the free public media databases straight from the browser.
// Every source is normalised into the same MediaResult shape.

import { aniListQuery, aniListToMedia, MEDIA_FIELDS, type AniListMedia } from "@/lib/anilist";

export type MediaType = "anime" | "manga" | "movie" | "tv" | "album";

export type MediaResult = {
  key: string; // unique across sources, e.g. "anilist:21"
  type: MediaType;
  title: string;
  subtitle: string | null; // alternate title or artist
  year: number | null;
  cover: string | null;
  details: string | null; // e.g. "TV · 24 episodes"
  // Length, used for XP. Undefined means "not looked up yet" (see /api/details);
  // null means the source doesn't know (e.g. an ongoing manga).
  totalUnits?: number | null; // episodes, chapters, tracks, or 1 for a movie
  unitMinutes?: number | null; // average minutes per episode/chapter/track
};

const SEARCH_QUERY = `
query ($search: String, $type: MediaType) {
  Page(perPage: 24) {
    media(search: $search, type: $type, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      ${MEDIA_FIELDS}
    }
  }
}`;

async function searchAniList(query: string, type: "anime" | "manga") {
  const data = await aniListQuery<{ Page: { media: AniListMedia[] } }>(SEARCH_QUERY, {
    search: query,
    type: type === "anime" ? "ANIME" : "MANGA",
  });
  return data.Page.media.map((m) => aniListToMedia(m, type));
}

// Albums go through our own /api/albums route; see src/lib/albums.ts.
async function searchAlbums(query: string) {
  const res = await fetch(`/api/albums?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Album search returned ${res.status}`);
  const json: { results: MediaResult[] } = await res.json();
  return json.results;
}

// Movies and TV go through our own /api/tmdb route; see src/lib/tmdb.ts.
async function searchMoviesAndTv(query: string, type: "movie" | "tv") {
  const res = await fetch(`/api/tmdb?type=${type}&q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Movie/TV search returned ${res.status}`);
  const json: { results: MediaResult[] } = await res.json();
  return json.results;
}

export async function searchMedia(type: MediaType, query: string) {
  switch (type) {
    case "anime":
    case "manga":
      return searchAniList(query, type);
    case "album":
      return searchAlbums(query);
    case "movie":
    case "tv":
      return searchMoviesAndTv(query, type);
  }
}
