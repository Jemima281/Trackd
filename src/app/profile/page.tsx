"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import RankBadge from "@/components/RankBadge";
import { rankFor, TIER_STYLES } from "@/lib/ranks";
import { listEntries } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";
import { totals } from "@/lib/xp";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<{ xp: number; hours: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    listEntries(user.id)
      .then((entries) => setStats(totals(entries)))
      .catch(() => {});
  }, [user]);

  if (loading) {
    return <p className="py-24 text-center text-white/50">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-black">You&apos;re not logged in</h1>
        <Link
          href="/login"
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
        >
          Log in
        </Link>
      </div>
    );
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const joined = profile
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Avatar username={profile?.username ?? user.email ?? "?"} size="lg" />
      <h1 className="text-3xl font-black">@{profile?.username ?? "unknown"}</h1>
      {joined && <p className="text-white/50">Collecting since {joined}</p>}
      {stats && (
        <Link href="/ranks" className="flex items-center gap-2">
          <RankBadge rank={rankFor(stats.xp)} size="sm" />
          <span className={`font-bold ${TIER_STYLES[rankFor(stats.xp).tier].text}`}>
            {rankFor(stats.xp).name}
          </span>
        </Link>
      )}
      <div className="mt-2 flex gap-8">
        <div>
          <p className="text-3xl font-black text-amber-400">
            {stats ? stats.xp.toLocaleString() : "…"}
          </p>
          <p className="text-xs uppercase tracking-wide text-white/50">XP</p>
        </div>
        <div>
          <p className="text-3xl font-black">{stats ? stats.hours.toLocaleString() : "…"}</p>
          <p className="text-xs uppercase tracking-wide text-white/50">Hours</p>
        </div>
      </div>
      {profile && (
        <Link
          href={`/u/${profile.username}`}
          className="mt-6 rounded-full bg-amber-400 px-6 py-2.5 font-bold text-black hover:bg-amber-300"
        >
          View my public profile
        </Link>
      )}
      <button
        onClick={signOut}
        className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
      >
        Log out
      </button>
    </div>
  );
}
