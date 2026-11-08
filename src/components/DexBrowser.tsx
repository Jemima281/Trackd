"use client";

import { useMemo, useState } from "react";
import MediaCard from "@/components/MediaCard";
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

const selectClass =
  "min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 [&>option]:bg-[#15151c]";

// A Dex grid with search, filters and sorting. Used for your own Dex (where
// tapping an item edits it) and other people's (read-only).
export default function DexBrowser({
  entries,
  onSelect,
  empty,
}: {
  entries: Entry[];
  onSelect?: (entry: Entry) => void;
  empty: React.ReactNode;
}) {
  const [type, setType] = useState<MediaType | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [ratingFilter, setRatingFilter] = useState<(typeof RATING_FILTERS)[number]["id"]>("any");

  // Search and rating narrow everything; type and status pills count within that.
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rating = RATING_FILTERS.find((r) => r.id === ratingFilter)!;
    return entries.filter(
      (e) =>
        (!q || e.title.toLowerCase().includes(q) || e.subtitle?.toLowerCase().includes(q)) &&
        rating.test(e),
    );
  }, [entries, query, ratingFilter]);
  const ofType = matching.filter((e) => type === "all" || e.media_type === type);
  const shown = ofType
    .filter((e) => status === "all" || e.status === status)
    .sort(SORTS[sort].compare);
  const filtering = query.trim() !== "" || ratingFilter !== "any";
  // "Watching" only makes sense as a filter label when one type is picked.
  const labelType: MediaType = type === "all" ? "anime" : type;

  return (
    <div className="flex flex-col gap-6">
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your Dex…"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 outline-none transition focus:border-amber-400"
          />
          <div className="flex gap-2">
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
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
              onChange={(e) => setRatingFilter(e.target.value as typeof ratingFilter)}
              className={selectClass}
            >
              {RATING_FILTERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="-mx-4 -mt-2 flex gap-2 overflow-x-auto px-4">
        {TYPES.map((t) => (
          <Pill key={t.type} active={type === t.type} onClick={() => setType(t.type)}>
            {t.label}
          </Pill>
        ))}
      </div>

      <div className="-mx-4 -mt-3 flex gap-2 overflow-x-auto px-4">
        <Pill active={status === "all"} onClick={() => setStatus("all")}>
          Any status ({ofType.length})
        </Pill>
        {STATUSES.map((s) => (
          <Pill key={s} active={status === s} onClick={() => setStatus(s)}>
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
              }}
              className="text-sm text-amber-400 hover:underline"
            >
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((e) => (
            <MediaCard
              key={e.id}
              item={entryToMedia(e)}
              entry={e}
              onClick={onSelect ? () => onSelect(e) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
