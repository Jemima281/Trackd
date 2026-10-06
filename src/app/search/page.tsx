"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import LogSheet from "@/components/LogSheet";
import MediaCard from "@/components/MediaCard";
import { getEntriesFor, type Entry } from "@/lib/entries";
import { searchMedia, type MediaResult, type MediaType } from "@/lib/search";

const TABS: { type: MediaType; label: string }[] = [
  { type: "anime", label: "Anime" },
  { type: "manga", label: "Manga" },
  { type: "movie", label: "Movies" },
  { type: "tv", label: "TV" },
  { type: "album", label: "Albums" },
];

export default function SearchPage() {
  const [type, setType] = useState<MediaType>("anime");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const { user } = useAuth();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [selected, setSelected] = useState<MediaResult | null>(null);

  const tab = TABS.find((t) => t.type === type)!;
  const trimmed = query.trim();

  // Wait until the user stops typing for a moment before searching.
  useEffect(() => {
    if (trimmed.length < 2) return;
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
  }, [type, trimmed]);

  // Look up which results are already in the user's Dex, to badge them.
  useEffect(() => {
    if (!user || results.length === 0) return;
    let cancelled = false;
    getEntriesFor(user.id, results.map((r) => r.key))
      .then((found) => {
        if (cancelled) return;
        setEntries((prev) => {
          const next = { ...prev };
          for (const e of found) next[e.media_key] = e;
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, results]);

  const showResults = trimmed.length >= 2;

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

      {!showResults ? (
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
              <MediaCard
                key={r.key}
                item={r}
                entry={user ? entries[r.key] : null}
                onClick={() => setSelected(r)}
              />
            ))}
        </div>
      )}

      {selected && (
        <LogSheet
          media={selected}
          entry={entries[selected.key] ?? null}
          onClose={() => setSelected(null)}
          onSaved={(e) => setEntries((prev) => ({ ...prev, [e.media_key]: e }))}
          onDeleted={(key) =>
            setEntries((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            })
          }
        />
      )}
    </div>
  );
}
