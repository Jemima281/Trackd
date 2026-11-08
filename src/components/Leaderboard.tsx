"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { describeError } from "@/components/LoadError";
import RankBadge from "@/components/RankBadge";
import { CATEGORIES, type MediaType } from "@/lib/categories";
import { shownName } from "@/lib/profile";
import { CATEGORY_SCALE, rankFor } from "@/lib/ranks";
import type { LeaderboardRow, Period } from "@/lib/stats";

const MEDALS = ["🥇", "🥈", "🥉"];

const CATEGORY_FILTERS: { type: MediaType | null; label: string }[] = [
  { type: null, label: "Everything" },
  ...CATEGORIES.map((c) => ({ type: c.type, label: c.label })),
];

function Row({
  place,
  row,
  isMe,
  scale,
  category,
  action,
}: {
  place: number;
  row: LeaderboardRow;
  isMe: boolean;
  scale: number | null; // null hides the rank badge
  category: MediaType | null;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        isMe ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      {row.xp > 0 && place <= 3 ? (
        <span className="w-6 text-center text-xl">{MEDALS[place - 1]}</span>
      ) : (
        <span className="w-6 text-center font-black text-white/40">{place}</span>
      )}
      <Link href={`/u/${row.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar username={row.username} emoji={row.avatar_emoji} color={row.avatar_color} />
        <div className="min-w-0">
          <p className="truncate font-semibold hover:underline">
            {shownName(row)} {isMe && <span className="text-white/40">(you)</span>}
          </p>
          <p className="text-xs font-bold text-amber-400">{row.xp.toLocaleString()} XP</p>
        </div>
      </Link>
      {scale !== null && (
        <RankBadge rank={rankFor(row.xp, scale)} category={category ?? undefined} size="sm" />
      )}
      {action}
    </div>
  );
}

// A leaderboard with This week / All time and category filters. `load`
// fetches the rows; change `reloadKey` to refetch (e.g. after friends change).
export default function Leaderboard({
  title = "Leaderboard",
  load,
  reloadKey,
  meId,
  rowAction,
  empty,
}: {
  title?: string;
  load: (period: Period, category: MediaType | null) => Promise<LeaderboardRow[]>;
  reloadKey?: unknown;
  meId: string;
  rowAction?: (row: LeaderboardRow) => React.ReactNode;
  empty?: React.ReactNode;
}) {
  const [period, setPeriod] = useState<Period>("week");
  const [category, setCategory] = useState<MediaType | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    load(period, category)
      .then((r) => {
        if (cancelled) return;
        setRows(r);
        setError(null);
      })
      .catch((err) => !cancelled && setError(describeError(err)));
    return () => {
      cancelled = true;
    };
  }, [load, period, category, reloadKey]);

  // Badges show all-time rank (in the chosen category); weekly XP isn't a rank.
  const scale = period === "all" ? (category ? CATEGORY_SCALE[category] : 1) : null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-xl font-black leading-tight">{title}</h2>
        <div className="flex shrink-0 gap-1 rounded-full border border-white/10 p-1">
          {(["week", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition ${
                period === p ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {p === "week" ? "This week" : "All time"}
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.label}
            onClick={() => setCategory(c.type)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              category === c.type
                ? "bg-amber-400 text-black"
                : "border border-white/15 text-white/70 hover:bg-white/10"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {period === "week" && (
        <p className="text-xs text-white/40">XP earned since Monday. Resets every week.</p>
      )}

      {error ? (
        <p className="break-words rounded-xl bg-white/5 px-4 py-3 text-center font-mono text-xs text-red-300/80">
          Couldn&apos;t load the leaderboard: {error}
        </p>
      ) : !rows ? (
        <p className="py-8 text-center text-white/50">Loading…</p>
      ) : (
        rows.map((row, i) => (
          <Row
            key={row.user_id}
            place={i + 1}
            row={row}
            isMe={row.user_id === meId}
            scale={scale}
            category={category}
            action={rowAction?.(row)}
          />
        ))
      )}
      {empty}
    </section>
  );
}
