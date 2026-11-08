import RankBadge from "@/components/RankBadge";
import { LADDER_XP, rankFor, TIER_STYLES, type Tier } from "@/lib/ranks";
import { compact } from "@/lib/statistics";

// The rank ladder as a path: every tier's emblem, where it starts, and where
// you are on it. Tiers above you are dimmed until you reach them.
export default function RankLadder({ xp }: { xp: number }) {
  const current = rankFor(xp);
  const tiers = LADDER_XP.map(([tier]) => tier);
  const currentIndex = tiers.indexOf(current.tier);

  return (
    <ol className="relative flex flex-col">
      {[...LADDER_XP].reverse().map(([tier, starts]) => {
        const index = tiers.indexOf(tier as Tier);
        const reached = index <= currentIndex;
        const here = index === currentIndex;
        const top = starts[starts.length - 1];
        return (
          <li key={tier} className="relative flex items-center gap-4 py-2">
            {/* connector line between emblems */}
            <span
              aria-hidden
              className={`absolute left-[21px] top-0 h-full w-0.5 ${reached ? "bg-white/25" : "bg-white/[0.07]"}`}
            />
            <div className={`relative z-10 ${reached ? "" : "opacity-35 grayscale"}`}>
              <RankBadge rank={rankFor(top)} size="sm" />
            </div>
            <div
              className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                here ? "border border-amber-400/40 bg-amber-400/[0.07]" : ""
              }`}
            >
              <div className="min-w-0">
                <p className={`font-black ${reached ? TIER_STYLES[tier as Tier].text : "text-white/40"}`}>
                  {tier}
                  {here && (
                    <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 align-middle text-[10px] font-bold text-black">
                      YOU · {current.division ?? "★"}
                    </span>
                  )}
                </p>
                <p className="text-xs text-white/40">
                  {starts.length > 1
                    ? starts.map((s, i) => `${["I", "II", "III"][i]} ${compact(s)}`).join(" · ")
                    : `${compact(starts[0])}+`}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${reached ? "text-white/70" : "text-white/30"}`}>
                {compact(starts[0])} XP
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
