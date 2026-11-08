// The one list of categories. Everything that shows, filters or counts by
// category reads from here. Keep MEDIA_TYPES in sync with the media_type
// check in supabase/migrations/0010_categories_groups_stats.sql.

export const MEDIA_TYPES = ["anime", "manga", "manhwa", "movie", "tv", "book"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

type Category = {
  type: MediaType;
  label: string; // plural, for tabs and headings
  icon: string;
  unit: string; // what progress counts, plural ("" for movies)
  doing: string; // in progress, e.g. "Watching"
  did: string; // past tense for the feed, e.g. "watched"
  plan: string; // for "wants to …"
  gradient: string; // landing page tile
};

const WATCH = { doing: "Watching", did: "watched", plan: "watch" };
const READ = { doing: "Reading", did: "read", plan: "read" };

export const CATEGORIES: Category[] = [
  { type: "anime", label: "Anime", icon: "🌸", unit: "episodes", ...WATCH, gradient: "from-pink-500/30" },
  { type: "manga", label: "Manga", icon: "📖", unit: "chapters", ...READ, gradient: "from-violet-500/30" },
  { type: "manhwa", label: "Manhwa", icon: "📱", unit: "chapters", ...READ, gradient: "from-emerald-500/30" },
  { type: "movie", label: "Movies", icon: "🎬", unit: "", ...WATCH, gradient: "from-red-500/30" },
  { type: "tv", label: "TV", icon: "📺", unit: "episodes", ...WATCH, gradient: "from-sky-500/30" },
  { type: "book", label: "Books", icon: "📚", unit: "pages", ...READ, gradient: "from-amber-500/30" },
];

export const CATEGORY: Record<MediaType, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.type, c]),
) as Record<MediaType, Category>;

export function isMediaType(value: string): value is MediaType {
  return (MEDIA_TYPES as readonly string[]).includes(value);
}
