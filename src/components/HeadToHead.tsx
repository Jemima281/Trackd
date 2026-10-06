"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useAuth, type Profile } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import LoadError, { describeError } from "@/components/LoadError";
import MediaCard from "@/components/MediaCard";
import RankBadge from "@/components/RankBadge";
import { entryToMedia, listEntries, type Entry } from "@/lib/entries";
import { getProfileByUsername } from "@/lib/friends";
import { CATEGORY_SCALE, rankFor, TIER_STYLES } from "@/lib/ranks";
import type { MediaType } from "@/lib/search";
import { getStats, type XpByType } from "@/lib/stats";

type Side = { profile: Profile; entries: Entry[]; byType: XpByType; xp: number };

type Loaded = { me: Side; them: Side } | "missing" | { error: string } | null;

const CATEGORIES: { type: MediaType; label: string; icon: string }[] = [
  { type: "anime", label: "Anime", icon: "🌸" },
  { type: "manga", label: "Manga", icon: "📖" },
  { type: "movie", label: "Movies", icon: "🎬" },
  { type: "tv", label: "TV", icon: "📺" },
  { type: "album", label: "Music", icon: "💿" },
];

async function loadSide(profile: Profile): Promise<Side> {
  const [entries, stats] = await Promise.all([listEntries(profile.id), getStats(profile.id)]);
  return { profile, entries, byType: stats.byType, xp: stats.xp };
}

function average(ns: number[]) {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
}

// You vs one other user: XP per category, shared completions and ratings.
export default function HeadToHead({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user, profile: myProfile, loading } = useAuth();
  const [data, setData] = useState<Loaded>(null);

  useEffect(() => {
    if (!myProfile) return;
    let cancelled = false;
    (async () => {
      try {
        const theirProfile = await getProfileByUsername(decodeURIComponent(username));
        if (!theirProfile) return !cancelled && setData("missing");
        const [me, them] = await Promise.all([loadSide(myProfile), loadSide(theirProfile)]);
        if (!cancelled) setData({ me, them });
      } catch (err) {
        if (!cancelled) setData({ error: describeError(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myProfile, username]);

  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-black">Log in to compare</h1>
        <Link
          href="/login"
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
        >
          Log in
        </Link>
      </div>
    );
  }
  if (data === null) return <p className="py-24 text-center text-white/50">Loading…</p>;
  if (data === "missing") {
    return (
      <p className="py-24 text-center text-white/60">
        No one called @{decodeURIComponent(username)}.
      </p>
    );
  }
  if ("error" in data) return <LoadError what="the comparison" detail={data.error} />;

  const { me, them } = data;
  if (me.profile.id === them.profile.id) {
    return <p className="py-24 text-center text-white/60">You can&apos;t battle yourself 🙂</p>;
  }

  // Things you've both completed, matched by media key.
  const theirByKey = new Map(them.entries.map((e) => [e.media_key, e]));
  const shared = me.entries
    .filter((e) => e.status === "completed" && theirByKey.get(e.media_key)?.status === "completed")
    .map((mine) => ({ mine, theirs: theirByKey.get(mine.media_key)! }));
  const bothRated = shared.filter((s) => s.mine.rating && s.theirs.rating);
  const myAvg = average(bothRated.map((s) => s.mine.rating!));
  const theirAvg = average(bothRated.map((s) => s.theirs.rating!));
  // 100% = identical ratings on everything, 0% = as far apart as possible.
  const agreement = bothRated.length
    ? Math.round(
        100 -
          (average(bothRated.map((s) => Math.abs(s.mine.rating! - s.theirs.rating!)))! / 9) * 100,
      )
    : null;
  const biggestFight = [...bothRated].sort(
    (a, b) =>
      Math.abs(b.mine.rating! - b.theirs.rating!) - Math.abs(a.mine.rating! - a.theirs.rating!),
  )[0];

  // Their favourites you haven't logged at all — instant recommendations.
  const myKeys = new Set(me.entries.map((e) => e.media_key));
  const recs = them.entries
    .filter((e) => e.status === "completed" && (e.rating ?? 0) >= 8 && !myKeys.has(e.media_key))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 12);

  const myRank = rankFor(me.xp);
  const theirRank = rankFor(them.xp);
  const winsMe = CATEGORIES.filter((c) => me.byType[c.type] > them.byType[c.type]).length;
  const winsThem = CATEGORIES.filter((c) => them.byType[c.type] > me.byType[c.type]).length;

  const player = (side: Side, rank: typeof myRank, leading: boolean) => (
    <Link
      href={`/u/${side.profile.username}`}
      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl p-3 text-center transition ${
        leading ? "bg-amber-400/10 ring-1 ring-amber-400/40" : ""
      }`}
    >
      <Avatar username={side.profile.username} size="lg" />
      <p className="max-w-full truncate font-black">@{side.profile.username}</p>
      <div className="flex items-center gap-1.5">
        <RankBadge rank={rank} size="sm" />
        <span className={`text-sm font-bold ${TIER_STYLES[rank.tier].text}`}>{rank.name}</span>
      </div>
      <p className="text-lg font-black text-amber-400">{side.xp.toLocaleString()} XP</p>
    </Link>
  );

  return (
    <div className="flex flex-col gap-8 py-8">
      <h1 className="sr-only">
        @{me.profile.username} vs @{them.profile.username}
      </h1>

      <section className="flex items-center gap-2 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-4">
        {player(me, myRank, me.xp > them.xp)}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-black text-white/30">VS</span>
          <span className="text-xs font-bold text-white/50">
            {winsMe}–{winsThem}
          </span>
        </div>
        {player(them, theirRank, them.xp > me.xp)}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black">Category battles</h2>
        {CATEGORIES.map((c) => {
          const a = me.byType[c.type];
          const b = them.byType[c.type];
          const share = a + b === 0 ? 0.5 : a / (a + b);
          const ra = rankFor(a, CATEGORY_SCALE[c.type]);
          const rb = rankFor(b, CATEGORY_SCALE[c.type]);
          return (
            <div key={c.type} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className={`font-bold ${a > b ? "text-amber-400" : "text-white/60"}`}>
                  {a.toLocaleString()} XP
                </span>
                <span className="font-bold">
                  {c.icon} {c.label}
                </span>
                <span className={`font-bold ${b > a ? "text-amber-400" : "text-white/60"}`}>
                  {b.toLocaleString()} XP
                </span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
                {a + b > 0 && (
                  <>
                    <div className="bg-amber-400" style={{ width: `${share * 100}%` }} />
                    <div className="flex-1 bg-sky-400" />
                  </>
                )}
              </div>
              <div className="flex justify-between text-xs">
                <span className={TIER_STYLES[ra.tier].text}>{ra.name}</span>
                <span className={TIER_STYLES[rb.tier].text}>{rb.name}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black">Taste check</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { value: shared.length, label: "both completed" },
            { value: agreement === null ? "–" : `${agreement}%`, label: "rating agreement" },
            {
              value:
                myAvg === null ? "–" : `${myAvg.toFixed(1)}/${theirAvg!.toFixed(1)}`,
              label: "avg rating, you/them",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-4">
              <p className="whitespace-nowrap text-xl font-black sm:text-2xl">{s.value}</p>
              <p className="text-xs text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
        {biggestFight && biggestFight.mine.rating !== biggestFight.theirs.rating && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            🥊 Biggest disagreement: <strong>{biggestFight.mine.title}</strong> — you gave it{" "}
            <strong className="text-amber-400">{biggestFight.mine.rating}</strong>, they gave it{" "}
            <strong className="text-sky-400">{biggestFight.theirs.rating}</strong>.
          </p>
        )}
      </section>

      {shared.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-black">You&apos;ve both completed</h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
            {shared.map(({ mine, theirs }) => (
              <div key={mine.id} className="flex flex-col gap-1">
                <MediaCard item={entryToMedia(mine)} />
                <p className="text-xs">
                  <span className="font-bold text-amber-400">You {mine.rating ?? "–"}</span>
                  <span className="text-white/30"> · </span>
                  <span className="font-bold text-sky-400">Them {theirs.rating ?? "–"}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-black">
            @{them.profile.username} loved these — you haven&apos;t tried them
          </h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
            {recs.map((e) => (
              <div key={e.id} className="flex flex-col gap-1">
                <MediaCard item={entryToMedia(e)} />
                <p className="text-xs font-bold text-sky-400">They gave it ★ {e.rating}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
