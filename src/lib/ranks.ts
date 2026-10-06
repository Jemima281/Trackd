import type { MediaType } from "@/lib/search";

// Rank ladder, Liftoff-style: 6 tiers with 3 divisions each, then Legend.
// Thresholds are the XP needed for the overall rank; each category uses the
// same ladder scaled down, since e.g. music takes far less time than anime.

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Legend";

export const LADDER_XP: [Tier, number[]][] = [
  ["Bronze", [0, 500, 1_500]],
  ["Silver", [3_000, 5_000, 7_500]],
  ["Gold", [10_000, 15_000, 20_000]],
  ["Platinum", [30_000, 40_000, 55_000]],
  ["Diamond", [75_000, 100_000, 130_000]],
  ["Master", [175_000, 240_000, 310_000]],
  ["Legend", [400_000]],
];

const DIVISIONS = ["I", "II", "III"];

const LADDER = LADDER_XP.flatMap(([tier, starts]) =>
  starts.map((minXp, i) => ({
    tier,
    division: tier === "Legend" ? null : DIVISIONS[i],
    minXp,
  })),
);

export const CATEGORY_SCALE: Record<MediaType, number> = {
  anime: 0.5,
  tv: 0.5,
  manga: 0.35,
  movie: 0.3,
  album: 0.15,
};

export type Rank = {
  tier: Tier;
  division: string | null;
  name: string; // e.g. "Gold II"
  nextName: string | null;
  xpIntoRank: number;
  xpForNext: number | null; // XP needed from this rank's start to the next
  progress: number; // 0–1 towards the next rank
};

export function rankFor(xp: number, scale = 1): Rank {
  const steps = LADDER.map((s) => ({ ...s, minXp: Math.round(s.minXp * scale) }));
  let i = 0;
  while (i + 1 < steps.length && xp >= steps[i + 1].minXp) i++;
  const step = steps[i];
  const next = steps[i + 1] ?? null;
  const label = (s: (typeof steps)[number]) => (s.division ? `${s.tier} ${s.division}` : s.tier);
  const xpForNext = next ? next.minXp - step.minXp : null;
  return {
    tier: step.tier,
    division: step.division,
    name: label(step),
    nextName: next ? label(next) : null,
    xpIntoRank: xp - step.minXp,
    xpForNext,
    progress: xpForNext ? Math.min(1, (xp - step.minXp) / xpForNext) : 1,
  };
}

export const TIER_STYLES: Record<Tier, { gradient: string; text: string; bar: string }> = {
  Bronze: { gradient: "from-orange-300 via-amber-700 to-orange-950", text: "text-orange-300", bar: "bg-orange-400" },
  Silver: { gradient: "from-white via-slate-300 to-slate-600", text: "text-slate-200", bar: "bg-slate-300" },
  Gold: { gradient: "from-yellow-100 via-yellow-400 to-amber-700", text: "text-yellow-300", bar: "bg-yellow-400" },
  Platinum: { gradient: "from-cyan-50 via-teal-300 to-cyan-800", text: "text-teal-200", bar: "bg-teal-300" },
  Diamond: { gradient: "from-sky-100 via-sky-400 to-indigo-700", text: "text-sky-300", bar: "bg-sky-400" },
  Master: { gradient: "from-rose-200 via-red-500 to-rose-950", text: "text-rose-400", bar: "bg-rose-500" },
  Legend: { gradient: "from-amber-200 via-fuchsia-500 to-indigo-800", text: "text-fuchsia-300", bar: "bg-fuchsia-400" },
};
