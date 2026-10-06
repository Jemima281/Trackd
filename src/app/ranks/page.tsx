"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import RankBadge from "@/components/RankBadge";
import RankProgress from "@/components/RankProgress";
import { listEntries, type Entry } from "@/lib/entries";
import { CATEGORY_SCALE, rankFor, TIER_STYLES } from "@/lib/ranks";
import type { MediaType } from "@/lib/search";
import { totals } from "@/lib/xp";

const CATEGORIES: { type: MediaType; label: string; icon: string }[] = [
  { type: "anime", label: "Anime", icon: "🌸" },
  { type: "manga", label: "Manga", icon: "📖" },
  { type: "movie", label: "Movies", icon: "🎬" },
  { type: "tv", label: "TV", icon: "📺" },
  { type: "album", label: "Music", icon: "💿" },
];

export default function RanksPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    listEntries(user.id)
      .then(setEntries)
      .catch(() => setFailed(true));
  }, [user]);

  if (loading || (user && !entries && !failed)) {
    return <p className="py-24 text-center text-white/50">Loading your ranks…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-4xl font-black">Ranks</h1>
        <p className="max-w-md text-white/60">
          Earn XP for every minute you watch, read and listen, and climb from Bronze to
          Legend.
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
      <p className="py-24 text-center text-red-300">Couldn&apos;t load your ranks. Try refreshing.</p>
    );
  }

  const overall = totals(entries);
  const rank = rankFor(overall.xp);

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
          Overall rank
        </p>
        <RankBadge rank={rank} size="lg" />
        <h1 className={`text-4xl font-black ${TIER_STYLES[rank.tier].text}`}>{rank.name}</h1>
        <p className="text-white/60">
          <span className="font-bold text-white">{overall.xp.toLocaleString()} XP</span> ·{" "}
          {overall.hours.toLocaleString()} hours
        </p>
        <div className="w-full max-w-sm">
          <RankProgress rank={rank} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black">By category</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const mine = entries.filter((e) => e.media_type === c.type);
            const { xp } = totals(mine);
            const r = rankFor(xp, CATEGORY_SCALE[c.type]);
            return (
              <div
                key={c.type}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <RankBadge rank={r} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold">
                      {c.icon} {c.label}
                    </p>
                    <p className={`text-sm font-bold ${TIER_STYLES[r.tier].text}`}>{r.name}</p>
                  </div>
                  <RankProgress rank={r} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-white/40">
        Bronze → Silver → Gold → Platinum → Diamond → Master → Legend
      </p>
    </div>
  );
}
