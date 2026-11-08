"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import LogSheet from "@/components/LogSheet";
import MediaCard from "@/components/MediaCard";
import { getEntriesFor, type Entry } from "@/lib/entries";
import { CATEGORIES, type MediaType } from "@/lib/categories";
import { searchMedia, type MediaResult } from "@/lib/search";

const TABS = CATEGORIES.map((c) => ({ type: c.type, label: c.label }));

export default function SearchPage() {
  const [type, setType] = useState<MediaType>("anime");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "busy" | "error">("idle");
  // Bumped to search again after AniList says it's busy.
  const [retry, setRetry] = useState(0);
  const { user } = useAuth();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [selected, setSelected] = useState<MediaResult | null>(null);

  const tab = TABS.find((t) => t.type === type)!;
  const trimmed = query.trim();

  // Wait until the user stops typing for a moment before searching.
  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const found = await searchMedia(type, trimmed);
        if (!cancelled) {
          setResults(found);
          setStatus("done");
        }
      } catch (err) {
        if (cancelled) return;
        // Rate limited: say so and try again by itself in a few seconds.
        const { status, retryAfter } = err as { status?: number; retryAfter?: number };
        if (status === 429) {
          setStatus("busy");
          retryTimer = setTimeout(() => setRetry((n) => n + 1), Math.min(retryAfter ?? 10, 60) * 1000);
        } else {
          setStatus("error");
        }
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(retryTimer);
    };
  }, [type, trimmed, retry]);

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
  const shown = results.filter((r) => r.type === type);
  // The Manga tab also finds Korean titles, which live under Manhwa. Point
  // there when the best match is one of them (e.g. "solo leveling").
  const best = results[0];
  const otherTab = best && best.type !== type ? TABS.find((t) => t.type === best.type) : undefined;
  const othersThere = results.filter((r) => r.type === best?.type).length;

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

      {(type === "movie" || type === "tv") && (
        <p className="-mt-3 text-xs text-white/40">
          Anime films and series are under <b className="text-white/60">Anime</b>, so they only count once.
        </p>
      )}

      {!showResults ? (
        <p className="py-16 text-center text-white/50">
          Type at least 2 letters to start searching.
        </p>
      ) : status === "error" ? (
        <p className="py-16 text-center text-red-300">
          Search isn&apos;t responding right now. Try again in a minute.
        </p>
      ) : status === "busy" ? (
        <p className="py-16 text-center text-white/50">
          Lots of searches right now. Trying again in a few seconds…
        </p>
      ) : status !== "done" && shown.length === 0 ? (
        <p className="py-16 text-center text-white/50">Searching…</p>
      ) : status === "done" && shown.length === 0 && !otherTab ? (
        <p className="py-16 text-center text-white/50">
          Nothing found for &ldquo;{trimmed}&rdquo; in {tab.label}. Check the spelling?
        </p>
      ) : (
        <>
          {status === "done" && otherTab && (
            <button
              onClick={() => setType(otherTab.type)}
              className="-mt-2 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-left text-sm text-white/70 hover:bg-amber-400/10"
            >
              <b className="text-white">{best.title}</b>
              {othersThere > 1 ? ` and ${othersThere - 1} more` : ""} found under{" "}
              <span className="font-bold text-amber-400">{otherTab.label} →</span>
            </button>
          )}
          <div
            className={`grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6 transition-opacity ${
              status === "loading" ? "opacity-50" : ""
            }`}
          >
            {shown.map((r) => (
              <MediaCard
                key={r.key}
                item={r}
                entry={user ? entries[r.key] : null}
                onClick={() => setSelected(r)}
              />
            ))}
          </div>
        </>
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
