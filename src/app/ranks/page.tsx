"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import RankOverview from "@/components/RankOverview";
import { LADDER_XP, rankFor, TIER_STYLES } from "@/lib/ranks";
import { getStats } from "@/lib/stats";

export default function RanksPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getStats>> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    getStats(user.id)
      .then(setStats)
      .catch(() => setFailed(true));
  }, [user]);

  if (loading || (user && !stats && !failed)) {
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

  if (failed || !stats) {
    return (
      <p className="py-24 text-center text-red-300">Couldn&apos;t load your ranks. Try refreshing.</p>
    );
  }

  const rank = rankFor(stats.xp);

  return (
    <div className="flex flex-col gap-8 py-8">
      <h1 className="sr-only">Ranks</h1>
      <RankOverview byType={stats.byType} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black">The ladder</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {LADDER_XP.map(([tier, starts]) => (
            <div
              key={tier}
              className={`flex items-center justify-between gap-4 border-b border-white/5 px-4 py-3 last:border-0 ${
                tier === rank.tier ? "bg-white/[0.06]" : ""
              }`}
            >
              <span className={`font-bold ${TIER_STYLES[tier].text}`}>{tier}</span>
              <span className="text-right text-sm tabular-nums text-white/60">
                {starts.map((xp) => xp.toLocaleString()).join(" · ")} XP
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40">
          Overall rank. Category ranks use a shorter ladder — music is the quickest to
          climb.
        </p>
      </section>
    </div>
  );
}
