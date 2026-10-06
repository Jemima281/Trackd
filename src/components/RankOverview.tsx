import RankBadge from "@/components/RankBadge";
import RankProgress from "@/components/RankProgress";
import type { Entry } from "@/lib/entries";
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

// Overall rank card plus one card per category, for any user's entries.
export default function RankOverview({
  entries,
  title = "Overall rank",
  header,
}: {
  entries: Entry[];
  title?: string;
  header?: React.ReactNode; // shown above the badge, e.g. an avatar
}) {
  const { xp } = totals(entries);
  const rank = rankFor(xp);

  return (
    <>
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-6 py-10 text-center">
        {header}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{title}</p>
        <RankBadge rank={rank} size="lg" />
        <h2 className={`text-4xl font-black ${TIER_STYLES[rank.tier].text}`}>{rank.name}</h2>
        <p className="text-lg font-bold">{xp.toLocaleString()} XP</p>
        <div className="w-full max-w-sm">
          <RankProgress rank={rank} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black">By category</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const r = rankFor(
              totals(entries.filter((e) => e.media_type === c.type)).xp,
              CATEGORY_SCALE[c.type],
            );
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
    </>
  );
}
