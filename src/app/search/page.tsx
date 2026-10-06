"use client";

import { useEffect, useState } from "react";
import MediaCard from "@/components/MediaCard";
import { searchMedia, type MediaResult, type MediaType } from "@/lib/search";

const TABS: { type: MediaType; label: string; ready: boolean }[] = [
  { type: "anime", label: "Anime", ready: true },
  { type: "manga", label: "Manga", ready: true },
  { type: "album", label: "Albums", ready: true },
  { type: "movie", label: "Movies", ready: false },
  { type: "tv", label: "TV", ready: false },
];

export default function SearchPage() {
  const [type, setType] = useState<MediaType>("anime");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const tab = TABS.find((t) => t.type === type)!;
  const trimmed = query.trim();

  // Wait until the user stops typing for a moment before searching.
  useEffect(() => {
    if (!tab.ready || trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const found = await searchMedia(type, trimmed);
        if (!cancelled) {
          setResults(found);
          setStatus("done");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [type, trimmed, tab.ready]);

  const showResults = tab.ready && trimmed.length >= 2;

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-4xl font-black">Search</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${tab.label.toLowerCase()}…`}
        autoFocus
        className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-lg outline-none transition focus:border-amber-400"
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              t.type === type
                ? "bg-amber-400 text-black"
                : "border border-white/15 text-white/70 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!tab.ready ? (
        <p className="py-16 text-center text-white/50">
          {tab.label} search is coming soon — it needs a free TMDB key first.
        </p>
      ) : !showResults ? (
        <p className="py-16 text-center text-white/50">
          Type at least 2 letters to start searching.
        </p>
      ) : status === "error" ? (
        <p className="py-16 text-center text-red-300">
          Search isn&apos;t responding right now. Try again in a minute.
        </p>
      ) : status === "done" && results.length === 0 ? (
        <p className="py-16 text-center text-white/50">
          Nothing found for &ldquo;{trimmed}&rdquo;.
        </p>
      ) : (
        <div
          className={`grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6 transition-opacity ${
            status === "loading" ? "opacity-50" : ""
          }`}
        >
          {results
            .filter((r) => r.type === type)
            .map((r) => (
              <MediaCard key={r.key} item={r} />
            ))}
        </div>
      )}
    </div>
  );
}
