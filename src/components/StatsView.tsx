"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useAuth, type Profile } from "@/components/AuthProvider";
import { BarList, ColumnChart, Heatmap } from "@/components/Charts";
import LoadError, { describeError } from "@/components/LoadError";
import MediaCard from "@/components/MediaCard";
import RankBadge from "@/components/RankBadge";
import RankProgress from "@/components/RankProgress";
import { CATEGORIES, CATEGORY, isMediaType, type MediaType } from "@/lib/categories";
import { entryToMedia, listEntries, statusLabel, type Entry } from "@/lib/entries";
import { getProfileByUsername } from "@/lib/friends";
import { shownName } from "@/lib/profile";
import { CATEGORY_SCALE, GENRE_SCALE, rankFor, TIER_STYLES } from "@/lib/ranks";
import { formatRating } from "@/lib/rating";
import {
  compact,
  fillMonths,
  getActivityDays,
  getXpByMonth,
  streaks,
  summarise,
  type DayXp,
  type MonthXp,
} from "@/lib/statistics";
import { getStats, type XpByType } from "@/lib/stats";

type Loaded =
  | { profile: Profile; entries: Entry[]; byType: XpByType; months: MonthXp[]; days: DayXp[] }
  | { error: string }
  | "missing"
  | null;

function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">{title}</h2>
        {hint && <span className="text-xs text-white/40">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  );
}

function duration(hours: number) {
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days.toLocaleString()}d ${Math.round(hours - days * 24)}h`;
}

const MONTH = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString(undefined, { month: "short", year: "numeric" });

// Statistics for one user: overall (`category` = "all") or one category.
export default function StatsView({
  params,
}: {
  params: Promise<{ username: string; category: string }>;
}) {
  const { username: rawUsername, category: rawCategory } = use(params);
  const username = decodeURIComponent(rawUsername);
  const category: MediaType | null = isMediaType(rawCategory) ? rawCategory : null;
  const [data, setData] = useState<Loaded>(null);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfileByUsername(username);
        if (!profile) return !cancelled && setData("missing");
        const [entries, stats, months, days] = await Promise.all([
          listEntries(profile.id),
          getStats(profile.id),
          getXpByMonth(profile.id, category),
          getActivityDays(profile.id, category),
        ]);
        if (!cancelled) setData({ profile, entries, byType: stats.byType, months, days });
      } catch (err) {
        if (!cancelled) setData({ error: describeError(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, category]);

  if (data === null) return <p className="py-24 text-center text-white/50">Crunching the numbers…</p>;
  if (data === "missing") return <p className="py-24 text-center text-white/60">No one called @{username}.</p>;
  if ("error" in data) return <LoadError what="these stats" detail={data.error} />;

  const { profile, byType } = data;
  const entries = category ? data.entries.filter((e) => e.media_type === category) : data.entries;
  const s = summarise(entries);
  const streak = streaks(data.days);
  const xp = category ? byType[category] : Object.values(byType).reduce((a, b) => a + b, 0);
  const rank = rankFor(xp, category ? CATEGORY_SCALE[category] : 1);
  const cat = category ? CATEGORY[category] : null;
  const base = `/u/${encodeURIComponent(profile.username)}/stats`;
  const months = fillMonths(data.months);
  const showFormats = category === "anime" && s.formats.length > 1;

  return (
    <div className="flex flex-col gap-4 py-6">
      <Link href={`/u/${encodeURIComponent(profile.username)}`} className="text-sm text-white/50 hover:text-white">
        ← {shownName(profile)}
      </Link>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4" aria-label="Category">
        {[{ type: "all", label: "Overall", icon: "🏆" }, ...CATEGORIES].map((c) => {
          const on = (c.type === "all" && !category) || c.type === category;
          return (
            <Link
              key={c.type}
              href={`${base}/${c.type}`}
              replace
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                on ? "bg-amber-400 text-black" : "border border-white/15 text-white/70 hover:bg-white/10"
              }`}
            >
              {c.icon} {c.label}
            </Link>
          );
        })}
      </nav>

      {/* Rank header */}
      <section className="flex items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
        <RankBadge rank={rank} category={category ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.15em] text-white/50">
            {cat ? `${cat.label} rank` : "Overall rank"}
          </p>
          <p className={`text-2xl font-black ${TIER_STYLES[rank.tier].text}`}>{rank.name}</p>
          <p className="mb-2 text-sm font-bold">{xp.toLocaleString()} XP</p>
          <RankProgress rank={rank} />
        </div>
      </section>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-white/50">
          Nothing logged{cat ? ` in ${cat.label.toLowerCase()}` : ""} yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Time spent" value={duration(s.hours)} sub={`${Math.round(s.hours).toLocaleString()} hours`} />
            <Tile label="Completed" value={s.completed.toLocaleString()} sub={`of ${s.total.toLocaleString()} logged`} />
            {cat && cat.unit ? (
              <Tile label={cat.unit.charAt(0).toUpperCase() + cat.unit.slice(1)} value={compact(s.units)} />
            ) : (
              <Tile label="In progress" value={s.inProgress.toLocaleString()} />
            )}
            <Tile
              label="Mean score"
              value={s.meanScore === null ? "–" : formatRating(s.meanScore)}
              sub={`${s.ratedCount.toLocaleString()} rated`}
            />
            <Tile label="Current streak" value={`${streak.current}d`} sub="days in a row" />
            <Tile label="Longest streak" value={`${streak.longest}d`} />
            <Tile label="Active days" value={streak.activeDays.toLocaleString()} sub="last 12 months" />
            <Tile label="Dropped" value={s.dropped.toLocaleString()} />
          </div>

          <Card title="Activity" hint="last 26 weeks">
            <Heatmap days={data.days} />
          </Card>

          <Card title="XP per month" hint="last 12 months">
            <ColumnChart
              label="XP per month"
              data={months.map((m) => ({
                label: m.month,
                value: m.xp,
                tick: new Date(`${m.month}-15T12:00:00Z`).toLocaleDateString(undefined, { month: "narrow" }),
              }))}
              format={(d) => `${MONTH(d.label)} · ${d.value.toLocaleString()} XP`}
            />
          </Card>

          {!category && (
            <Card title="By category" hint="tap for details">
              <BarList
                format={(v) => `${v.toLocaleString()} XP`}
                data={CATEGORIES.map((c) => ({
                  label: c.label,
                  icon: c.icon,
                  value: byType[c.type],
                  href: `${base}/${c.type}`,
                })).sort((a, b) => b.value - a.value)}
              />
            </Card>
          )}

          <Card title="Status">
            <BarList
              data={(["completed", "in_progress", "planning", "dropped"] as const).map((st) => ({
                label:
                  st === "in_progress" && !category ? "In progress" : statusLabel(st, category ?? "anime"),
                value: { completed: s.completed, in_progress: s.inProgress, planning: s.planning, dropped: s.dropped }[st],
              }))}
            />
          </Card>

          <Card title="Score distribution" hint={s.meanScore === null ? undefined : `mean ${formatRating(s.meanScore)}`}>
            {s.ratedCount === 0 ? (
              <p className="py-4 text-sm text-white/40">Rate a few things to see this.</p>
            ) : (
              <ColumnChart
                label="Number of ratings per score"
                data={s.scores}
                height={100}
                format={(d) => `${d.label === "10" ? "10" : `${d.label}.0–${d.label}.9`} · ${d.value} rated`}
              />
            )}
          </Card>

          <GenreRanks genres={s.genres} linkToDex={user?.id === profile.id} />

          {showFormats && (
            <Card title="Formats">
              <BarList data={s.formats} />
            </Card>
          )}

          {s.decades.length > 1 && (
            <Card title="Release decades">
              <ColumnChart
                label="Titles per release decade"
                data={s.decades}
                height={90}
                format={(d) => `${d.label} · ${d.value} titles`}
              />
            </Card>
          )}

          {s.topRated.length > 0 && (
            <Card title="Highest rated">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {s.topRated.map((e) => (
                  <div key={e.id} className="flex min-w-0 flex-col gap-1">
                    <MediaCard item={entryToMedia(e)} />
                    <p className="text-xs font-bold text-amber-400">★ {formatRating(e.rating!)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {s.timeSinks.length > 0 && (
            <Card title="Biggest time sinks">
              <ol className="flex flex-col divide-y divide-white/5">
                {s.timeSinks.map((e, i) => (
                  <li key={e.id} className="flex items-center gap-3 py-2">
                    <span className="w-4 text-sm font-black text-white/30">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {CATEGORY[e.media_type].icon} {e.title}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-white/60">
                      {Math.round((e.progress * (e.unit_minutes ?? 0)) / 60).toLocaleString()}h ·{" "}
                      {e.xp.toLocaleString()} XP
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Each genre's own rank, from the XP of titles in that genre.
function GenreRanks({
  genres,
  linkToDex,
}: {
  genres: { genre: string; count: number; xp: number }[];
  linkToDex: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? genres : genres.slice(0, 8);
  const max = Math.max(1, ...genres.map((g) => g.xp));
  return (
    <Card title="Genre ranks" hint={linkToDex ? "tap to see them in your Dex" : undefined}>
      {genres.length === 0 ? (
        <p className="py-2 text-sm text-white/40">No genres yet. They fill in as you log things.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((g, i) => {
            const r = rankFor(g.xp, GENRE_SCALE);
            const row = (
              <>
                <span className="w-5 text-sm font-black text-white/30">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{g.genre}</span>
                    <span className={`shrink-0 text-xs font-bold ${TIER_STYLES[r.tier].text}`}>{r.name}</span>
                  </span>
                  <span className="mt-1 block h-1.5 w-full rounded-full bg-white/[0.06]">
                    <span
                      className="block h-1.5 rounded-full bg-amber-400"
                      style={{ width: `${Math.max(2, (g.xp / max) * 100)}%` }}
                    />
                  </span>
                  <span className="mt-0.5 block text-xs text-white/40">
                    {g.xp.toLocaleString()} XP · {g.count} {g.count === 1 ? "title" : "titles"}
                  </span>
                </span>
              </>
            );
            return (
              <li key={g.genre}>
                {linkToDex ? (
                  <Link
                    href={`/dex?genre=${encodeURIComponent(g.genre)}`}
                    className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.05]"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-1.5">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {genres.length > 8 && (
        <button onClick={() => setShowAll((v) => !v)} className="self-start text-sm text-amber-400">
          {showAll ? "Show fewer" : `Show all ${genres.length} genres`}
        </button>
      )}
    </Card>
  );
}
