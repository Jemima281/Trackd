"use client";

import { useId } from "react";
import type { Rank, Tier } from "@/lib/ranks";

// Rank emblems drawn as SVG. Each tier adds ornaments so higher ranks look
// grander: Bronze shield → Silver wings → Gold crown → Platinum gem →
// Diamond cut stone → Master laurels and flames → Legend sunburst.

const SIZES = { sm: 40, md: 64, lg: 150 };

const METAL: Record<Tier, [string, string, string]> = {
  Bronze: ["#f6c896", "#b8733a", "#5c3014"],
  Silver: ["#ffffff", "#c3cbd6", "#5d6875"],
  Gold: ["#fff4b8", "#f5c518", "#9a6400"],
  Platinum: ["#e9fffb", "#6ee7d8", "#0d6b63"],
  Diamond: ["#e6f4ff", "#5fa8ff", "#33259c"],
  Master: ["#ffd0d0", "#ef4444", "#6e1515"],
  Legend: ["#fff1a8", "#e879f9", "#5b21b6"],
};

const SHIELD = "M60 22 L92 33 V61 C92 83 78 99 60 109 C42 99 28 83 28 61 V33 Z";
const INSET = "translate(60 64) scale(0.8) translate(-60 -64)";

function Wings({ fill }: { fill: string }) {
  const feathers = [
    "M31 37 C19 36 9 30 3 21 C13 25 22 27 31 28 Z",
    "M31 49 C17 50 7 45 1 37 C11 40 21 41 31 40 Z",
    "M31 61 C19 63 10 60 5 53 C13 54 22 54 31 52 Z",
  ];
  return (
    <g fill={fill} stroke="rgb(0 0 0 / 0.35)" strokeWidth="0.8">
      {feathers.map((d) => (
        <path key={d} d={d} />
      ))}
      <g transform="translate(120 0) scale(-1 1)">
        {feathers.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </g>
  );
}

function Crown({ fill }: { fill: string }) {
  return (
    <g>
      <path
        d="M44 26 L46 10 L53 18 L60 6 L67 18 L74 10 L76 26 Z"
        fill={fill}
        stroke="rgb(0 0 0 / 0.4)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {[46, 60, 74].map((x, i) => (
        <circle key={x} cx={x} cy={[10, 6, 10][i]} r="2.4" fill="#fff8d6" />
      ))}
    </g>
  );
}

function Laurel({ fill }: { fill: string }) {
  // Leaves along an arc on each side of the shield.
  // Degrees around the shield's centre: 155° is upper left, 265° the bottom.
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const deg = 155 + i * 18;
    const a = deg * (Math.PI / 180);
    return { x: 60 + Math.cos(a) * 42, y: 66 - Math.sin(a) * 42, rot: deg + 90 };
  });
  const side = leaves.map((l) => (
    <ellipse
      key={`${l.x}-${l.y}`}
      cx={l.x}
      cy={l.y}
      rx="3.2"
      ry="8"
      transform={`rotate(${-l.rot} ${l.x} ${l.y})`}
    />
  ));
  return (
    <g fill={fill} stroke="rgb(0 0 0 / 0.3)" strokeWidth="0.6">
      {side}
      <g transform="translate(120 0) scale(-1 1)">{side}</g>
    </g>
  );
}

function Flame({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-flame`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="0.6" stopColor="#f97316" />
          <stop offset="1" stopColor="#fde047" />
        </linearGradient>
      </defs>
      <path
        d="M60 0 C67 11 74 14 71 25 C77 21 80 15 80 9 C88 21 85 33 76 38 H44 C35 33 32 21 40 9 C40 15 43 21 49 25 C46 14 53 11 60 0 Z"
        fill={`url(#${id}-flame)`}
      />
    </g>
  );
}

function Sunburst({ fill }: { fill: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const b = a + Math.PI / 16;
    const p = (ang: number, r: number) => `${60 + Math.cos(ang) * r} ${64 + Math.sin(ang) * r}`;
    return `M60 64 L${p(a - 0.08, 60)} L${p(b - 0.1, 30)} Z`;
  });
  return (
    <g fill={fill} opacity="0.55">
      {rays.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

function Stars() {
  const star = (x: number, y: number, r: number) => {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.35;
      return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
    }).join(" ");
    return <polygon key={`${x}-${y}`} points={pts} fill="#fff" />;
  };
  return <g>{[star(14, 14, 6), star(106, 18, 5), star(108, 100, 6), star(10, 96, 4)]}</g>;
}

export default function RankBadge({
  rank,
  size = "md",
}: {
  rank: Rank;
  size?: keyof typeof SIZES;
}) {
  const id = `rk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [light, mid, dark] = METAL[rank.tier];
  const tier = rank.tier;
  const px = SIZES[size];
  const label = rank.division ?? "★";

  // Main body: a shield for most tiers, a hexagon for Platinum, a cut stone for Diamond.
  const body =
    tier === "Platinum"
      ? "M60 18 L93 37 V79 L60 108 L27 79 V37 Z"
      : tier === "Diamond"
        ? "M38 30 H82 L101 52 L60 108 L19 52 Z"
        : SHIELD;

  const wingFill = tier === "Gold" || tier === "Legend" ? "#ffe9a3" : tier === "Platinum" ? "#f1f5f9" : "#dfe5ec";
  const hasWings = ["Silver", "Gold", "Platinum", "Legend"].includes(tier);
  const hasCrown = tier === "Gold" || tier === "Legend";

  return (
    <svg
      viewBox="0 0 120 120"
      width={px}
      height={px}
      role="img"
      aria-label={rank.name}
      className="shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
    >
      <title>{rank.name}</title>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark} stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {tier === "Legend" && <Sunburst fill={light} />}
      {tier === "Master" && <Flame id={id} />}
      {tier === "Master" && <Laurel fill="#e9b949" />}
      {hasWings && <Wings fill={wingFill} />}

      <path d={body} fill={`url(#${id}-metal)`} stroke={dark} strokeWidth="2" strokeLinejoin="round" />
      <path d={body} transform={INSET} fill={`url(#${id}-inner)`} />

      {/* Facets so the gems read as cut stones. */}
      {tier === "Diamond" && (
        <g stroke="rgb(255 255 255 / 0.45)" strokeWidth="1.2" fill="none">
          <path d="M19 52 H101 M38 30 L48 52 L60 30 L72 52 L82 30 M48 52 L60 108 L72 52" />
        </g>
      )}
      {tier === "Platinum" && (
        <g stroke="rgb(255 255 255 / 0.35)" strokeWidth="1" fill="none">
          <path d="M60 18 V36 M27 37 L44 46 M93 37 L76 46 M27 79 L44 72 M93 79 L76 72 M60 108 V90" />
        </g>
      )}

      {/* Glossy highlight across the top half. */}
      <path d={body} fill={`url(#${id}-shine)`} transform="translate(60 40) scale(0.86 0.5) translate(-60 -40)" />

      {hasCrown && <Crown fill={tier === "Legend" ? "#ffd84d" : "#ffe27a"} />}
      {tier === "Diamond" && (
        <g fill="#fff">
          <path d="M100 18 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" />
          <path d="M18 88 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" />
        </g>
      )}
      {tier === "Legend" && <Stars />}

      <text
        x="60"
        y={tier === "Diamond" ? 74 : 72}
        textAnchor="middle"
        fontSize={label.length > 2 ? 22 : 28}
        fontWeight="900"
        fill="#fff"
        stroke="rgb(0 0 0 / 0.55)"
        strokeWidth="3"
        paintOrder="stroke"
        fontFamily="var(--font-geist-sans), Arial, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}
