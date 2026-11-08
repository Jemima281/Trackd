"use client";

import { useMemo, useRef, useState } from "react";
import MediaCard from "@/components/MediaCard";
import Pager, { paginate } from "@/components/Pager";
import { genreCounts } from "@/lib/genres";
import { entryToMedia, statusLabel, STATUSES, type Entry, type Status } from "@/lib/entries";
import { CATEGORIES, type MediaType } from "@/lib/categories";

const TYPES: { type: MediaType | "all"; label: string }[] = [
  { type: "all", label: "All" },
  ...CATEGORIES.map((c) => ({ type: c.type, label: c.label })),
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-amber-400 text-black"
          : "border border-white/15 text-white/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

const SORTS = {
  recent: { label: "Recently updated", compare: (a: Entry, b: Entry) => b.updated_at.localeCompare(a.updated_at) },
  rating_desc: { label: "Highest rated", compare: (a: Entry, b: Entry) => (b.rating ?? -1) - (a.rating ?? -1) },
  rating_asc: { label: "Lowest rated", compare: (a: Entry, b: Entry) => (a.rating ?? 11) - (b.rating ?? 11) },
  title: { label: "Title A–Z", compare: (a: Entry, b: Entry) => a.title.localeCompare(b.title) },
  xp: { label: "Most XP", compare: (a: Entry, b: Entry) => b.xp - a.xp },
  year_desc: { label: "Newest release", compare: (a: Entry, b: Entry) => (b.year ?? 0) - (a.year ?? 0) },
  year_asc: { label: "Oldest release", compare: (a: Entry, b: Entry) => (a.year ?? 9999) - (b.year ?? 9999) },
} satisfies Record<string, { label: string; compare: (a: Entry, b: Entry) => number }>;

type SortKey = keyof typeof SORTS;

const RATING_FILTERS = [
  { id: "any", label: "Any rating", test: () => true },
  { id: "9", label: "9.0+", test: (e: Entry) => (e.rating ?? -1) >= 9 },
  { id: "8", label: "8.0+", test: (e: Entry) => (e.rating ?? -1) >= 8 },
  { id: "7", label: "7.0+", test: (e: Entry) => (e.rating ?? -1) >= 7 },
  { id: "5", label: "5.0+", test: (e: Entry) => (e.rating ?? -1) >= 5 },
  { id: "low", label: "Under 5.0", test: (e: Entry) => e.rating != null && e.rating < 5 },
  { id: "unrated", label: "Not rated", test: (e: Entry) => e.rating == null },
] as const;

const PAGE_SIZE = 24;

const selectClass =
  "min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 [&>option]:bg-[#15151c]";

// A Dex grid with search, filters and sorting. Used for your own Dex (where
// tapping an item edits it) and other people's (read-only).
export default function DexBrowser({
  entries,
  onSelect,
  empty,
  initialGenre = "",
}: {
  entries: Entry[];
  onSelect?: (entry: Entry) => void;
  empty: React.ReactNode;
  initialGenre?: string;
}) {
  const [type, setType] = useState<MediaType | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [ratingFilter, setRatingFilter] = useState<(typeof RATING_FILTERS)[number]["id"]>("any");
  const [genre, setGenre] = useState(initialGenre);
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const genres = useMemo(() => genreCounts(entries), [entries]);

  // Any filter change starts again from page 1.
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  function goToPage(p: number) {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Search and rating narrow everything; type and status pills count within that.
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rating = RATING_FILTERS.find((r) => r.id === ratingFilter)!;
    return entries.filter(
      (e) =>
        (!q || e.title.toLowerCase().includes(q) || e.subtitle?.toLowerCase().includes(q)) &&
        (!genre || e.genres.includes(genre)) &&
        rating.test(e),
    );
  }, [entries, query, ratingFilter, genre]);
  const ofType = matching.filter((e) => type === "all" || e.media_type === type);
  const shown = ofType
    .filter((e) => status === "all" || e.status === status)
    .sort(SORTS[sort].compare);
  const filtering = query.trim() !== "" || ratingFilter !== "any" || genre !== "";
  const { pageItems, pageCount, current } = paginate(shown, page, PAGE_SIZE);
  // "Watching" only makes sense as a filter label when one type is picked.
  const labelType: MediaType = type === "all" ? "anime" : type;

  return (
    <div ref={topRef} className="flex scroll-mt-20 flex-col gap-6">
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => filter(setQuery)(e.target.value)}
            placeholder="Search your Dex…"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 outline-none transition focus:border-amber-400"
          />
          <div className="flex gap-2">
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => filter(setSort)(e.target.value as SortKey)}
              className={selectClass}
            >
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Rating"
              value={ratingFilter}
              onChange={(e) => filter(setRatingFilter)(e.target.value as typeof ratingFilter)}
              className={selectClass}
            >
              {RATING_FILTERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {genres.length > 0 && (
            <select
              aria-label="Genre"
              value={genre}
              onChange={(e) => filter(setGenre)(e.target.value)}
              className={selectClass}
            >
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g.genre} value={g.genre}>
                  {g.genre} ({g.count})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="-mx-4 -mt-2 flex gap-2 overflow-x-auto px-4">
        {TYPES.map((t) => (
          <Pill key={t.type} active={type === t.type} onClick={() => filter(setType)(t.type)}>
            {t.label}
          </Pill>
        ))}
      </div>

      <div className="-mx-4 -mt-3 flex gap-2 overflow-x-auto px-4">
        <Pill active={status === "all"} onClick={() => filter(setStatus)("all")}>
          Any status ({ofType.length})
        </Pill>
        {STATUSES.map((s) => (
          <Pill key={s} active={status === s} onClick={() => filter(setStatus)(s)}>
            {type === "all" && s === "in_progress" ? "In progress" : statusLabel(s, labelType)}{" "}
            ({ofType.filter((e) => e.status === s).length})
          </Pill>
        ))}
      </div>

      {entries.length === 0 ? (
        empty
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-white/50">
          <p>{filtering ? "Nothing matches those filters." : "Nothing here yet."}</p>
          {filtering && (
            <button
              onClick={() => {
                setQuery("");
                setRatingFilter("any");
                setGenre("");
                setPage(1);
              }}
              className="text-sm text-amber-400 hover:underline"
            >
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <>
        <p className="-mt-2 text-xs text-white/40">
          {shown.length.toLocaleString()} {shown.length === 1 ? "item" : "items"}
          {pageCount > 1 && ` · page ${current} of ${pageCount}`}
        </p>
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {pageItems.map((e) => (
            <MediaCard
              key={e.id}
              item={entryToMedia(e)}
              entry={e}
              onClick={onSelect ? () => onSelect(e) : undefined}
            />
          ))}
        </div>
        <Pager page={current} pageCount={pageCount} onChange={goToPage} />
        </>
      )}
    </div>
  );
}
