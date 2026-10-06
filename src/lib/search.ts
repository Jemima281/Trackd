// Searches the free public media databases straight from the browser.
// Every source is normalised into the same MediaResult shape.

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

const ANILIST_QUERY = `
query ($search: String, $type: MediaType) {
  Page(perPage: 24) {
    media(search: $search, type: $type, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      id
      format
      episodes
      duration
      nextAiringEpisode { episode }
      chapters
      volumes
      title { romaji english }
      coverImage { large }
      startDate { year }
    }
  }
}`;

type AniListMedia = {
  id: number;
  format: string | null;
  episodes: number | null;
  duration: number | null;
  nextAiringEpisode: { episode: number } | null;
  chapters: number | null;
  volumes: number | null;
  title: { romaji: string | null; english: string | null };
  coverImage: { large: string | null } | null;
  startDate: { year: number | null } | null;
};

const FORMAT_LABELS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music video",
  MANGA: "Manga",
  NOVEL: "Light novel",
  ONE_SHOT: "One-shot",
};

export const MANGA_MINUTES_PER_CHAPTER = 5;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

async function searchAniList(query: string, type: "anime" | "manga") {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: ANILIST_QUERY,
      variables: { search: query, type: type === "anime" ? "ANIME" : "MANGA" },
    }),
  });
  if (!res.ok) throw new Error(`AniList returned ${res.status}`);
  const json = await res.json();
  const media: AniListMedia[] = json.data?.Page?.media ?? [];

  return media.map((m): MediaResult => {
    const title = m.title.english ?? m.title.romaji ?? "Untitled";
    const alt = m.title.romaji && m.title.romaji !== title ? m.title.romaji : null;
    const count =
      type === "anime"
        ? m.episodes && plural(m.episodes, "episode")
        : m.chapters
          ? plural(m.chapters, "chapter")
          : m.volumes && plural(m.volumes, "volume");
    const details = [m.format && FORMAT_LABELS[m.format], count]
      .filter(Boolean)
      .join(" · ");
    // Ongoing anime have no final episode count; use the episodes aired so far.
    const totalUnits =
      type === "anime"
        ? (m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null))
        : (m.chapters ?? (m.format === "ONE_SHOT" ? 1 : null));
    return {
      key: `anilist:${m.id}`,
      totalUnits,
      unitMinutes: type === "anime" ? (m.duration ?? 24) : MANGA_MINUTES_PER_CHAPTER,
      type,
      title,
      subtitle: alt,
      year: m.startDate?.year ?? null,
      cover: m.coverImage?.large ?? null,
      details: details || null,
    };
  });
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
