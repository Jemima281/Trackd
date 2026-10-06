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
};

const ANILIST_QUERY = `
query ($search: String, $type: MediaType) {
  Page(perPage: 24) {
    media(search: $search, type: $type, isAdult: false, sort: SEARCH_MATCH) {
      id
      format
      episodes
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
    return {
      key: `anilist:${m.id}`,
      type,
      title,
      subtitle: alt,
      year: m.startDate?.year ?? null,
      cover: m.coverImage?.large ?? null,
      details: details || null,
    };
  });
}

type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
  "secondary-types"?: string[];
  "artist-credit"?: { name: string; joinphrase?: string }[];
};

// Escape characters that have special meaning in MusicBrainz's search syntax.
function escapeLucene(text: string) {
  return text.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, "\\$&");
}

async function searchAlbums(query: string) {
  const lucene = `releasegroup:(${escapeLucene(query)}) AND primarytype:album`;
  const res = await fetch(
    `https://musicbrainz.org/ws/2/release-group?fmt=json&limit=24&query=${encodeURIComponent(lucene)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`MusicBrainz returned ${res.status}`);
  const json = await res.json();
  const groups: MusicBrainzReleaseGroup[] = json["release-groups"] ?? [];

  return groups.map((g): MediaResult => {
    const artist =
      g["artist-credit"]?.map((c) => c.name + (c.joinphrase ?? "")).join("") || null;
    const year = g["first-release-date"]?.slice(0, 4);
    return {
      key: `musicbrainz:${g.id}`,
      type: "album",
      title: g.title,
      subtitle: artist,
      year: year ? Number(year) : null,
      cover: `https://coverartarchive.org/release-group/${g.id}/front-250`,
      details: g["secondary-types"]?.join(" · ") || "Album",
    };
  });
}

export async function searchMedia(type: MediaType, query: string) {
  switch (type) {
    case "anime":
    case "manga":
      return searchAniList(query, type);
    case "album":
      return searchAlbums(query);
    default:
      // Movies and TV need a TMDB key — added in a later step.
      return [];
  }
}
