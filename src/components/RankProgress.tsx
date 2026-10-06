import { TIER_STYLES, type Rank } from "@/lib/ranks";

export default function RankProgress({ rank, unit = "XP" }: { rank: Rank; unit?: string }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${TIER_STYLES[rank.tier].bar}`}
          style={{ width: `${Math.max(2, rank.progress * 100)}%` }}
        />
      </div>
      <p className="text-xs text-white/50">
        {rank.nextName && rank.xpForNext
          ? `${(rank.xpForNext - rank.xpIntoRank).toLocaleString()} ${unit} to ${rank.nextName}`
          : "Top rank reached 👑"}
      </p>
    </div>
  );
}
