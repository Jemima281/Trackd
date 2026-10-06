"use client";

import { useState } from "react";
import MediaCard from "@/components/MediaCard";
import { entryToMedia, statusLabel, STATUSES, type Entry, type Status } from "@/lib/entries";
import type { MediaType } from "@/lib/search";

const TYPES: { type: MediaType | "all"; label: string }[] = [
  { type: "all", label: "All" },
  { type: "anime", label: "Anime" },
  { type: "manga", label: "Manga" },
  { type: "movie", label: "Movies" },
  { type: "tv", label: "TV" },
  { type: "album", label: "Albums" },
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

// A Dex grid with type and status filters. Used for your own Dex (where
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

  const ofType = entries.filter((e) => type === "all" || e.media_type === type);
  const shown = ofType.filter((e) => status === "all" || e.status === status);
  // "Watching" only makes sense as a filter label when one type is picked.
  const labelType: MediaType = type === "all" ? "anime" : type;

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
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
        <p className="py-16 text-center text-white/50">Nothing here yet.</p>
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
