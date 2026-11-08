"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import LoadError, { describeError } from "@/components/LoadError";
import RankLadder from "@/components/RankLadder";
import RankOverview from "@/components/RankOverview";
import ShareRankCard from "@/components/ShareRankCard";
import { getStats } from "@/lib/stats";

export default function RanksPage() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getStats>> | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getStats(user.id)
      .then(setStats)
      .catch((err) => setFailed(describeError(err)));
  }, [user]);

  if (loading || (user && !stats && !failed)) {
    return <p className="py-24 text-center text-white/50">Loading your ranks…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-4xl font-black">Ranks</h1>
        <p className="max-w-md text-white/60">
          Earn XP for every minute you watch and read, and climb from Bronze to
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
    return <LoadError what="your ranks" detail={failed ?? ""} />;
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <h1 className="sr-only">Ranks</h1>
      <RankOverview
        byType={stats.byType}
        username={profile?.username}
        actions={profile && <ShareRankCard profile={profile} byType={stats.byType} hours={stats.hours} />}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black">The ladder</h2>
        <RankLadder xp={stats.xp} />
        <p className="text-xs text-white/40">
          Overall rank. Category ranks use a shorter ladder; Legend in one category takes far fewer XP.
        </p>
      </section>
    </div>
  );
}
