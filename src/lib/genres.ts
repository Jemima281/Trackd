// Genres come from three sources that name them differently (TMDB "Science
// Fiction", AniList "Sci-Fi", Open Library "Science fiction"), so they're
// normalised to one set of names before being saved, filtered or ranked.

const ALIASES: Record<string, string[]> = {
  "science fiction": ["Sci-Fi"],
  "sci-fi": ["Sci-Fi"],
  "scifi": ["Sci-Fi"],
  "sci-fi & fantasy": ["Sci-Fi", "Fantasy"],
  "action & adventure": ["Action", "Adventure"],
  "war & politics": ["War"],
  "mahou shoujo": ["Magical Girl"],
  "slice of life": ["Slice of Life"],
  "tv movie": [],
  "fiction": [],
  "animation": [], // everything in Anime is animated; not a useful genre
  "ecchi": ["Ecchi"],
};

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function normalizeGenres(list: (string | null | undefined)[] | null | undefined): string[] {
  const out: string[] = [];
  for (const raw of list ?? []) {
    const g = raw?.trim();
    if (!g) continue;
    const mapped = ALIASES[g.toLowerCase()] ?? [titleCase(g)];
    for (const m of mapped) if (!out.includes(m)) out.push(m);
  }
  return out.slice(0, 12);
}

// The genres most people will look for, for leaderboard pickers.
export const COMMON_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Psychological",
  "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller", "Crime",
  "Mecha", "Music", "History", "Documentary", "Family",
];

// How many of these entries carry each genre, most common first.
export function genreCounts(entries: { genres?: string[] | null }[]) {
  const counts = new Map<string, number>();
  for (const e of entries) for (const g of normalizeGenres(e.genres)) counts.set(g, (counts.get(g) ?? 0) + 1);
  return [...counts.entries()].map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count);
}
