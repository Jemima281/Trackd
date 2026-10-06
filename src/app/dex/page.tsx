"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import LogSheet from "@/components/LogSheet";
import MediaCard from "@/components/MediaCard";
import {
  entryToMedia,
  listEntries,
  statusLabel,
  STATUSES,
  type Entry,
  type Status,
} from "@/lib/entries";
import type { MediaType } from "@/lib/search";
import { totals } from "@/lib/xp";

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

export default function DexPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [type, setType] = useState<MediaType | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    if (!user) return;
    listEntries(user.id)
      .then(setEntries)
      .catch(() => setFailed(true));
  }, [user]);

  if (loading || (user && !entries && !failed)) {
    return <p className="py-24 text-center text-white/50">Loading your Dex…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-4xl font-black">Your Dex</h1>
        <p className="max-w-md text-white/60">
          Log in to start collecting everything you watch, read and listen to.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (failed || !entries) {
    return (
      <p className="py-24 text-center text-red-300">
        Couldn&apos;t load your Dex. Try refreshing.
      </p>
    );
  }

  const ofType = entries.filter((e) => type === "all" || e.media_type === type);
  const shown = ofType.filter((e) => status === "all" || e.status === status);
  const completed = entries.filter((e) => e.status === "completed").length;
  const { xp } = totals(entries);
  // "Watching" only makes sense as a filter label when one type is picked.
  const labelType: MediaType = type === "all" ? "anime" : type;

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl font-black">Your Dex</h1>
        <div className="flex gap-4 text-right text-sm text-white/50">
          <p>
            <span className="text-2xl font-black text-emerald-400">{completed}</span>{" "}
            done
          </p>
          <p>
            <span className="text-2xl font-black text-amber-400">{xp.toLocaleString()}</span>{" "}
            XP
          </p>
        </div>
      </div>

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
            {type === "all" && s === "in_progress"
              ? "In progress"
              : statusLabel(s, labelType)}{" "}
            ({ofType.filter((e) => e.status === s).length})
          </Pill>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-white/60">Your Dex is empty. Time to start collecting!</p>
          <Link
            href="/search"
            className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
          >
            Find something
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <p className="py-16 text-center text-white/50">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((e) => (
            <MediaCard
              key={e.id}
              item={entryToMedia(e)}
              entry={e}
              onClick={() => setSelected(e)}
            />
          ))}
        </div>
      )}

      {selected && (
        <LogSheet
          media={entryToMedia(selected)}
          entry={selected}
          onClose={() => setSelected(null)}
          onSaved={(saved) =>
            setEntries((prev) => [saved, ...(prev ?? []).filter((e) => e.id !== saved.id)])
          }
          onDeleted={(key) =>
            setEntries((prev) => (prev ?? []).filter((e) => e.media_key !== key))
          }
        />
      )}
    </div>
  );
}
