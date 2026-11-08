// Searches the free public media databases straight from the browser.
// Every source is normalised into the same MediaResult shape.

import { aniListQuery, aniListToMedia, MEDIA_FIELDS, type AniListMedia } from "@/lib/anilist";
import { searchBooks } from "@/lib/books";

import type { MediaType } from "@/lib/categories";
export { MEDIA_TYPES, type MediaType } from "@/lib/categories";

export type MediaResult = {
  key: string; // unique across sources, e.g. "anilist:21"
  type: MediaType;
  title: string;
  subtitle: string | null; // alternate title
  year: number | null;
  cover: string | null;
  details: string | null; // e.g. "TV · 24 episodes"
  // Length, used for XP. Undefined means "not looked up yet" (see /api/details);
  // null means the source doesn't know (e.g. an ongoing manga).
  totalUnits?: number | null; // episodes, chapters, pages, or 1 for a movie
  unitMinutes?: number | null; // average minutes per episode/chapter/page
  genres?: string[];
};

// AniList returns nothing at all if countryOfOrigin is sent as null, so the
// country filter is only part of the query when there's a country to filter by.
function searchQuery(withCountry: boolean) {
  return `
query ($search: String, $type: MediaType${withCountry ? ", $country: CountryCode" : ""}) {
  Page(perPage: 30) {
    media(search: $search, type: $type,${withCountry ? " countryOfOrigin: $country," : ""} isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      ${MEDIA_FIELDS}
    }
  }
}`;
}

// Anime, manga and manhwa all come from AniList. Manhwa are Korean comics,
// which AniList files under manga, so the Manhwa tab asks for Korean titles
// only. The Manga tab gets everything; Korean results come back typed as
// manhwa so the page can point to the Manhwa tab.
async function searchAniList(query: string, type: "anime" | "manga" | "manhwa") {
  const kind = type === "anime" ? "anime" : "manga";
  const variables: Record<string, string> = { search: query, type: kind === "anime" ? "ANIME" : "MANGA" };
  if (type === "manhwa") variables.country = "KR";
  // A search can't wait a minute for the rate limit; fail fast and let the page retry.
  const data = await aniListQuery<{ Page: { media: AniListMedia[] } }>(
    searchQuery(type === "manhwa"),
    variables,
    { attempts: 2, maxWaitSeconds: 5 },
  );
  return data.Page.media.map((m) => aniListToMedia(m, kind)).slice(0, 24);
}

// Movies and TV go through our own /api/tmdb route; see src/lib/tmdb.ts.
async function searchMoviesAndTv(query: string, type: "movie" | "tv") {
  const res = await fetch(`/api/tmdb?type=${type}&q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Movie/TV search returned ${res.status}`);
  const json: { results: MediaResult[] } = await res.json();
  return json.results;
}

export async function searchMedia(type: MediaType, query: string): Promise<MediaResult[]> {
  switch (type) {
    case "anime":
    case "manga":
    case "manhwa":
      return searchAniList(query, type);
    case "movie":
    case "tv":
      return searchMoviesAndTv(query, type);
    case "book":
      return searchBooks(query);
  }
}
