// AniList (anime + manga) helpers shared by search and import.

import { normalizeGenres } from "@/lib/genres";
import type { MediaResult } from "@/lib/search";

export const MANGA_MINUTES_PER_CHAPTER = 5;
// Webtoon chapters are a single scroll, usually quicker to read.
export const MANHWA_MINUTES_PER_CHAPTER = 4;

// Fields we ask AniList for on every media item.
export const MEDIA_FIELDS = `
  id
  idMal
  format
  episodes
  duration
  nextAiringEpisode { episode }
  chapters
  volumes
  title { romaji english }
  coverImage { large }
  startDate { year }
  countryOfOrigin
  genres
`;

export type AniListMedia = {
  id: number;
  idMal: number | null;
  format: string | null;
  episodes: number | null;
  duration: number | null;
  nextAiringEpisode: { episode: number } | null;
  chapters: number | null;
  volumes: number | null;
  title: { romaji: string | null; english: string | null };
  coverImage: { large: string | null } | null;
  startDate: { year: number | null } | null;
  countryOfOrigin?: string | null;
  genres?: string[] | null;
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

// AniList files manhwa (Korean comics) under MANGA; we give them their own category.
export function aniListType(m: AniListMedia, kind: "anime" | "manga") {
  if (kind === "anime") return "anime" as const;
  return m.countryOfOrigin === "KR" ? ("manhwa" as const) : ("manga" as const);
}

export function aniListToMedia(m: AniListMedia, kind: "anime" | "manga"): MediaResult {
  const type = aniListType(m, kind);
  const title = m.title.english ?? m.title.romaji ?? "Untitled";
  const alt = m.title.romaji && m.title.romaji !== title ? m.title.romaji : null;
  const count =
    kind === "anime"
      ? m.episodes && plural(m.episodes, "episode")
      : m.chapters
        ? plural(m.chapters, "chapter")
        : m.volumes && plural(m.volumes, "volume");
  const details = [m.format && FORMAT_LABELS[m.format], count].filter(Boolean).join(" · ");
  // Ongoing anime have no final episode count; use the episodes aired so far.
  const totalUnits =
    kind === "anime"
      ? (m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null))
      : (m.chapters ?? (m.format === "ONE_SHOT" ? 1 : null));
  return {
    key: `anilist:${m.id}`,
    type,
    title,
    subtitle: alt,
    year: m.startDate?.year ?? null,
    cover: m.coverImage?.large ?? null,
    details: details || null,
    totalUnits: totalUnits || null,
    unitMinutes:
      type === "anime"
        ? (m.duration ?? 24)
        : type === "manhwa"
          ? MANHWA_MINUTES_PER_CHAPTER
          : MANGA_MINUTES_PER_CHAPTER,
    genres: normalizeGenres(m.genres),
  };
}

// Runs an AniList GraphQL query, waiting and retrying if rate limited.
export async function aniListQuery<T>(query: string, variables: object, attempts = 4): Promise<T> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 429 && attempts > 1) {
    const wait = Number(res.headers.get("Retry-After")) || 30;
    await new Promise((r) => setTimeout(r, wait * 1000));
    return aniListQuery(query, variables, attempts - 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    const message = json.errors?.[0]?.message ?? `AniList returned ${res.status}`;
    throw Object.assign(new Error(message), { status: json.errors?.[0]?.status ?? res.status });
  }
  return json.data as T;
}
