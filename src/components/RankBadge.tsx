import { TIER_STYLES, type Rank } from "@/lib/ranks";

const SIZES = {
  sm: { box: "h-9 w-8", text: "text-[10px]" },
  md: { box: "h-16 w-14", text: "text-sm" },
  lg: { box: "h-32 w-28", text: "text-3xl" },
};

// A shield in the tier's colours with the division numeral inside.
export default function RankBadge({ rank, size = "md" }: { rank: Rank; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  const shield = "polygon(50% 0, 100% 15%, 100% 60%, 50% 100%, 0 60%, 0 15%)";
  return (
    <div className={`relative shrink-0 ${s.box}`} title={rank.name}>
      <div
        className={`absolute inset-0 bg-gradient-to-br ${TIER_STYLES[rank.tier].gradient}`}
        style={{ clipPath: shield }}
      />
      <div
        className="absolute inset-[12%] bg-black/35"
        style={{ clipPath: shield }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center pb-[8%] font-black text-white drop-shadow ${s.text}`}
      >
        {rank.division ?? "★"}
      </span>
    </div>
  );
}
