// Album search, run on our server (Deezer's API doesn't allow direct browser
// calls). Deezer ranks by popularity and matches artist names as well as
// titles. If Deezer is unreachable we fall back to the iTunes Search API.

import type { MediaResult } from "@/lib/search";

type DeezerAlbum = {
  id: number;
  title: string;
  cover_xl?: string;
  cover_big?: string;
  nb_tracks?: number;
  record_type?: string; // "album" | "ep" | "single" | "compile"
  artist?: { name: string };
};

type ITunesAlbum = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
};

const RECORD_TYPES: Record<string, string> = {
  album: "Album",
  ep: "EP",
  compile: "Compilation",
};

// Streaming catalogues often list the same album several times (explicit,
// clean, deluxe re-uploads…). Keep the first, most popular, copy.
function dedupe(results: MediaResult[]) {
  const seen = new Set<string>();
  return results.filter((r) => {
    const id = `${r.title.toLowerCase()}|${r.subtitle?.toLowerCase()}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function fromDeezer(albums: DeezerAlbum[]): MediaResult[] {
  return dedupe(
    albums
      .filter((a) => a.record_type !== "single")
      .map((a) => ({
        key: `deezer:${a.id}`,
        type: "album" as const,
        title: a.title,
        subtitle: a.artist?.name ?? null,
        year: null,
        cover: a.cover_xl ?? a.cover_big ?? null,
        details: [
          RECORD_TYPES[a.record_type ?? "album"] ?? "Album",
          a.nb_tracks ? `${a.nb_tracks} tracks` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
  );
}

export function fromITunes(albums: ITunesAlbum[]): MediaResult[] {
  return dedupe(
    albums
      .filter((a) => !a.collectionName.endsWith(" - Single"))
      .map((a) => ({
        key: `itunes:${a.collectionId}`,
        type: "album" as const,
        title: a.collectionName.replace(/ - EP$/, ""),
        subtitle: a.artistName,
        year: a.releaseDate ? new Date(a.releaseDate).getUTCFullYear() : null,
        cover: a.artworkUrl100?.replace("100x100bb", "600x600bb") ?? null,
        details: [
          a.collectionName.endsWith(" - EP") ? "EP" : "Album",
          a.trackCount ? `${a.trackCount} tracks` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
  );
}

async function searchDeezer(query: string) {
  const res = await fetch(
    `https://api.deezer.com/search/album?limit=40&q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`Deezer returned ${res.status}`);
  const json = await res.json();
  // Deezer reports some failures (e.g. quota) as 200 with an error body.
  if (json.error) throw new Error(`Deezer error: ${JSON.stringify(json.error)}`);
  return fromDeezer(json.data ?? []);
}

async function searchITunes(query: string) {
  const res = await fetch(
    `https://itunes.apple.com/search?media=music&entity=album&limit=40&term=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`iTunes returned ${res.status}`);
  const json = await res.json();
  return fromITunes(json.results ?? []);
}

export async function searchAlbumsOnServer(query: string) {
  try {
    return await searchDeezer(query);
  } catch (err) {
    console.error("Deezer search failed, falling back to iTunes:", err);
    return searchITunes(query);
  }
}
