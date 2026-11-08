import Link from "next/link";
import RankBadge from "@/components/RankBadge";
import RankProgress from "@/components/RankProgress";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_SCALE, rankFor, TIER_STYLES } from "@/lib/ranks";
import type { XpByType } from "@/lib/stats";

// Overall rank card plus one card per category, for any user. With a
// username, every card opens that rank's statistics.
export default function RankOverview({
  byType,
  username,
  title = "Overall rank",
  actions,
}: {
  byType: XpByType;
  username?: string;
  title?: string;
  actions?: React.ReactNode; // e.g. a share button under the overall rank
}) {
  const xp = Object.values(byType).reduce((a, b) => a + b, 0);
  const rank = rankFor(xp);
  const stats = (c: string) => (username ? `/u/${encodeURIComponent(username)}/stats/${c}` : null);
  const overallHref = stats("all");

  return (
    <>
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{title}</p>
        <RankBadge rank={rank} size="lg" />
        <h2 className={`text-4xl font-black ${TIER_STYLES[rank.tier].text}`}>{rank.name}</h2>
        <p className="text-lg font-bold">{xp.toLocaleString()} XP</p>
        <div className="w-full max-w-sm">
          <RankProgress rank={rank} />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {overallHref && (
            <Link
              href={overallHref}
              className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10"
            >
              📊 See all stats
            </Link>
          )}
          {actions}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-black">By category</h2>
          {overallHref && <span className="text-xs text-white/40">Tap for stats</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const r = rankFor(byType[c.type], CATEGORY_SCALE[c.type]);
            const href = stats(c.type);
            const body = (
              <>
                <RankBadge rank={r} category={c.type} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold">
                      {c.icon} {c.label}
                    </p>
                    <p className={`text-sm font-bold ${TIER_STYLES[r.tier].text}`}>{r.name}</p>
                  </div>
                  <RankProgress rank={r} />
                </div>
                {href && <span className="text-xl text-white/30 transition group-hover:text-white/70">›</span>}
              </>
            );
            const card = "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4";
            return href ? (
              <Link
                key={c.type}
                href={href}
                className={`group ${card} transition hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.99]`}
              >
                {body}
              </Link>
            ) : (
              <div key={c.type} className={card}>
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
