"use client";

import { useId } from "react";
import type { Rank, Tier } from "@/lib/ranks";

// Rank emblems, drawn as SVG. Every tier shares a bevelled hexagon medallion
// with a themed icon inside; the frame grows more ornate as you climb:
//   Bronze  popcorn        riveted hexagon
//   Silver  film reel      + side blades, gem
//   Gold    clapperboard   + laurels, crest
//   Platinum open manga    + feathered wings
//   Diamond crossed katanas + crystal wings, diamond
//   Master  oni mask       + horns, flames, laurels
//   Legend  phoenix        + golden wings, crown, sunburst, stars
//
// To use artwork instead, put images in /public/ranks/ and list them here,
// e.g. { Gold: "/ranks/gold.png" }.
const IMAGE_OVERRIDES: Partial<Record<Tier, string>> = {};

const SIZES = { sm: 44, md: 72, lg: 170 };

type Palette = {
  light: string;
  mid: string;
  dark: string;
  deep: string; // darkest, for the inner field edge
  glow: string; // centre glow of the field
};

const PALETTES: Record<Tier, Palette> = {
  Bronze: { light: "#ffd6a8", mid: "#c07a3e", dark: "#7a4219", deep: "#2a1407", glow: "#a8642e" },
  Silver: { light: "#ffffff", mid: "#c9d1db", dark: "#6c7886", deep: "#1b2129", glow: "#8b97a6" },
  Gold: { light: "#fff6c2", mid: "#f2c230", dark: "#9a6a00", deep: "#2e1d00", glow: "#c9900a" },
  Platinum: { light: "#eafffb", mid: "#73e3d4", dark: "#13786f", deep: "#04201e", glow: "#2fb3a3" },
  Diamond: { light: "#eef6ff", mid: "#78b4ff", dark: "#3a3cc0", deep: "#0b0b3a", glow: "#4f6dff" },
  Master: { light: "#ffd9d4", mid: "#f0473f", dark: "#8e1717", deep: "#2a0505", glow: "#c1271f" },
  Legend: { light: "#fff3b5", mid: "#e98af7", dark: "#6b23c0", deep: "#170434", glow: "#a43be0" },
};

const GOLD: Palette = PALETTES.Gold;

// ---------- geometry helpers ----------

const CX = 100;
const CY = 104;

function hex(r: number, cx = CX, cy = CY) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
}

function hexVertices(r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const;
  });
}

// A pointed leaf/feather from (x, y), `len` long, pointing at `deg` degrees.
function blade(x: number, y: number, len: number, deg: number, width: number, bend = 0.15) {
  const a = (deg * Math.PI) / 180;
  const tx = x + Math.cos(a) * len;
  const ty = y + Math.sin(a) * len;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const mx = x + Math.cos(a) * len * 0.45;
  const my = y + Math.sin(a) * len * 0.45;
  const b = len * bend;
  const c1 = `${(mx + nx * width + Math.cos(a) * b).toFixed(1)} ${(my + ny * width + Math.sin(a) * b).toFixed(1)}`;
  const c2 = `${(mx - nx * width * 0.7).toFixed(1)} ${(my - ny * width * 0.7).toFixed(1)}`;
  return `M${x.toFixed(1)} ${y.toFixed(1)} Q${c1} ${tx.toFixed(1)} ${ty.toFixed(1)} Q${c2} ${x.toFixed(1)} ${y.toFixed(1)}Z`;
}

// A broad feather with a rounded tip, from (x, y), `len` long, at `deg` degrees.
function feather(x: number, y: number, len: number, deg: number, width: number) {
  const a = (deg * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const nx = -uy;
  const ny = ux;
  const at = (t: number, side: number) =>
    `${(x + ux * len * t + nx * width * side).toFixed(1)} ${(y + uy * len * t + ny * width * side).toFixed(1)}`;
  return [
    `M${x.toFixed(1)} ${y.toFixed(1)}`,
    `Q${at(0.5, 1.1)} ${at(0.9, 0.55)}`,
    `Q${at(1.06, 0)} ${at(0.9, -0.55)}`,
    `Q${at(0.5, -1.1)} ${x.toFixed(1)} ${y.toFixed(1)}Z`,
  ].join(" ");
}

function quill(x: number, y: number, len: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + Math.cos(a) * len * 0.85).toFixed(1)} ${(y + Math.sin(a) * len * 0.85).toFixed(1)}`;
}

// Mirror children across the vertical centre line.
function Mirror({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <g transform={`translate(${CX * 2} 0) scale(-1 1)`}>{children}</g>
    </>
  );
}

// ---------- ornaments (drawn behind the medallion) ----------

function Wings({ id, palette, layers }: { id: string; palette: Palette; layers: 2 | 3 }) {
  // A fan of broad feathers from the "shoulder" beside the medallion,
  // longest at the top, in overlapping layers.
  const rows = [
    { n: 7, root: [58, 96], len: [72, 42], deg: [-118, -200], fill: `url(#${id}-wingA)` },
    { n: 6, root: [60, 100], len: [54, 32], deg: [-126, -196], fill: `url(#${id}-wingB)` },
    { n: 5, root: [62, 102], len: [36, 24], deg: [-134, -192], fill: `url(#${id}-wingC)` },
  ].slice(3 - layers);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wingA`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <linearGradient id={`${id}-wingB`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor={palette.mid} />
        </linearGradient>
        <linearGradient id={`${id}-wingC`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor={palette.light} />
        </linearGradient>
      </defs>
      <Mirror>
        {rows.map((row, r) => (
          <g key={r} fill={row.fill} stroke={palette.dark} strokeWidth="0.9" strokeLinejoin="round">
            {Array.from({ length: row.n }, (_, i) => {
              const t = i / (row.n - 1);
              const len = row.len[0] + (row.len[1] - row.len[0]) * t;
              const deg = row.deg[0] + (row.deg[1] - row.deg[0]) * t;
              const y = row.root[1] + i * 2;
              return (
                <g key={i}>
                  <path d={feather(row.root[0], y, len, deg, len * 0.2)} />
                  <path d={quill(row.root[0], y, len, deg)} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="0.8" />
                </g>
              );
            })}
          </g>
        ))}
      </Mirror>
    </g>
  );
}

function CrystalWings({ id, palette }: { id: string; palette: Palette }) {
  const shards = [
    "M64 84 L18 44 L30 78 Z",
    "M62 94 L6 76 L28 98 Z",
    "M64 104 L12 112 L36 116 Z",
    "M66 112 L26 138 L46 128 Z",
  ];
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-shard`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={palette.mid} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
      </defs>
      <Mirror>
        {shards.map((d) => (
          <g key={d}>
            <path d={d} fill={`url(#${id}-shard)`} stroke={palette.dark} strokeWidth="1" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="0.6" transform="translate(1.5 -1)" />
          </g>
        ))}
      </Mirror>
    </g>
  );
}

function Blades({ palette }: { palette: Palette }) {
  return (
    <Mirror>
      <path
        d="M44 90 L22 104 L44 118 L40 104 Z"
        fill={palette.mid}
        stroke={palette.dark}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M40 104 L22 104" stroke="rgb(255 255 255 / 0.6)" strokeWidth="1" />
    </Mirror>
  );
}

function Laurel({ id, palette, rise = 0 }: { id: string; palette: Palette; rise?: number }) {
  const leaves = Array.from({ length: 8 }, (_, i) => {
    const deg = 120 + i * 17 - rise;
    const a = (deg * Math.PI) / 180;
    const r = 72;
    return { x: CX + Math.cos(a) * r, y: CY - Math.sin(a) * r * 0.95, deg };
  });
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
      </defs>
      <Mirror>
        <path
          d={`M${leaves[0].x} ${leaves[0].y} ${leaves.map((l) => `L${l.x.toFixed(1)} ${l.y.toFixed(1)}`).join(" ")}`}
          fill="none"
          stroke={palette.dark}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {leaves.map((l, i) => (
          <g key={i} fill={`url(#${id}-leaf)`} stroke={palette.dark} strokeWidth="0.8">
            <path d={blade(l.x, l.y, 19, -l.deg + 205, 6.5, 0.05)} />
            <path d={blade(l.x, l.y, 16, -l.deg + 125, 5.5, 0.05)} />
          </g>
        ))}
      </Mirror>
    </g>
  );
}

function Horns({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-horn`} x1="0" y1="1" x2="0.3" y2="0">
          <stop offset="0" stopColor="#3b0c0c" />
          <stop offset="0.6" stopColor="#d9c7a3" />
          <stop offset="1" stopColor="#fffbe8" />
        </linearGradient>
      </defs>
      <Mirror>
        <path
          d="M74 62 C56 56 40 40 36 10 C48 26 62 36 84 44 Z"
          fill={`url(#${id}-horn)`}
          stroke="#2a0606"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {[0.25, 0.45, 0.65].map((t) => (
          <path
            key={t}
            d={`M${74 - t * 30} ${60 - t * 34} q${6} ${-2} ${10} ${-8}`}
            fill="none"
            stroke="rgb(60 10 10 / 0.6)"
            strokeWidth="1.2"
          />
        ))}
      </Mirror>
    </g>
  );
}

function Flames({ id }: { id: string }) {
  const tongues = [
    { x: 100, h: 66, w: 18 },
    { x: 80, h: 50, w: 14 },
    { x: 120, h: 50, w: 14 },
    { x: 64, h: 34, w: 12 },
    { x: 136, h: 34, w: 12 },
  ];
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-fire`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#b91c1c" />
          <stop offset="0.45" stopColor="#f97316" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      {tongues.map((t) => {
        const base = 52;
        return (
          <path
            key={t.x}
            d={`M${t.x - t.w} ${base} C${t.x - t.w} ${base - t.h * 0.5} ${t.x - t.w * 0.2} ${base - t.h * 0.6} ${t.x} ${base - t.h} C${t.x + t.w * 0.3} ${base - t.h * 0.6} ${t.x + t.w} ${base - t.h * 0.45} ${t.x + t.w} ${base} Z`}
            fill={`url(#${id}-fire)`}
            stroke="#7f1d1d"
            strokeWidth="0.8"
          />
        );
      })}
    </g>
  );
}

function Halo() {
  return (
    <g>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const long = i % 2 === 0;
        const r1 = 52;
        const r2 = long ? 98 : 80;
        const w = long ? 0.05 : 0.035;
        const p = (ang: number, r: number) =>
          `${(CX + Math.cos(ang) * r).toFixed(1)} ${(CY + Math.sin(ang) * r).toFixed(1)}`;
        return (
          <path
            key={i}
            d={`M${p(a - w, r1)} L${p(a, r2)} L${p(a + w, r1)} Z`}
            fill={long ? GOLD.light : GOLD.mid}
            opacity={long ? 0.4 : 0.22}
          />
        );
      })}
    </g>
  );
}

function Crown({ id, y = 32 }: { id: string; y?: number }) {
  return (
    <g transform={`translate(0 ${y - 32})`}>
      <defs>
        <linearGradient id={`${id}-crown`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.5" stopColor="#f2c230" />
          <stop offset="1" stopColor="#8a5a00" />
        </linearGradient>
      </defs>
      <path
        d="M70 44 L66 14 L82 28 L100 6 L118 28 L134 14 L130 44 Z"
        fill={`url(#${id}-crown)`}
        stroke="#5a3a00"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect x="69" y="38" width="62" height="9" rx="2" fill={`url(#${id}-crown)`} stroke="#5a3a00" strokeWidth="1.2" />
      {[
        [66, 14],
        [100, 6],
        [134, 14],
      ].map(([x, yy]) => (
        <circle key={x} cx={x} cy={yy} r="3.6" fill="#fffbe6" stroke="#5a3a00" strokeWidth="1" />
      ))}
      <circle cx="100" cy="42.5" r="3.2" fill="#e11d48" stroke="#5a3a00" strokeWidth="0.8" />
      <circle cx="84" cy="42.5" r="2.4" fill="#2563eb" />
      <circle cx="116" cy="42.5" r="2.4" fill="#2563eb" />
    </g>
  );
}

function TopGem({ color, y = 38 }: { color: string; y?: number }) {
  return (
    <g>
      <path d={`M100 ${y - 12} L110 ${y} L100 ${y + 12} L90 ${y} Z`} fill={color} stroke="#000" strokeOpacity="0.5" strokeWidth="1.2" />
      <path d={`M100 ${y - 12} L104 ${y} L100 ${y + 12}`} fill="rgb(255 255 255 / 0.35)" />
    </g>
  );
}

function Diamond({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-dia`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#9cc9ff" />
          <stop offset="1" stopColor="#3b48d6" />
        </linearGradient>
      </defs>
      <path d="M86 26 H114 L124 38 L100 62 L76 38 Z" fill={`url(#${id}-dia)`} stroke="#1e1b6b" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M76 38 H124 M86 26 L92 38 L100 26 L108 38 L114 26 M92 38 L100 62 L108 38" stroke="rgb(255 255 255 / 0.7)" strokeWidth="0.8" fill="none" />
    </g>
  );
}

function Sparkles({ points }: { points: [number, number, number][] }) {
  return (
    <g fill="#fff">
      {points.map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`}
        />
      ))}
    </g>
  );
}

// ---------- centre icons ----------

function Popcorn({ p }: { p: Palette }) {
  return (
    <g>
      {[
        [84, 84, 9],
        [96, 78, 10],
        [109, 80, 9],
        [118, 88, 8],
        [90, 92, 8],
        [104, 90, 9],
        [80, 94, 7],
      ].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff7e0" stroke={p.dark} strokeWidth="1.3" />
      ))}
      <path d="M76 96 H124 L116 134 H84 Z" fill="#fff4e6" stroke={p.dark} strokeWidth="1.6" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${82 + i * 14} 96 H${90 + i * 14} L${89 + i * 12} 134 H${83 + i * 12} Z`}
          fill="#d93a2e"
        />
      ))}
      <path d="M76 96 H124" stroke={p.dark} strokeWidth="2.5" />
    </g>
  );
}

function FilmReel({ p }: { p: Palette }) {
  return (
    <g>
      <path
        d="M118 120 C130 128 140 128 148 118 L152 126 C142 138 128 138 114 128 Z"
        fill={p.dark}
        stroke={p.deep}
        strokeWidth="1"
      />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={122 + i * 9} y={123 + (i === 1 ? 3 : 0)} width="3.5" height="3" fill={p.light} rx="0.5" />
      ))}
      <circle cx="98" cy="100" r="30" fill={p.light} stroke={p.dark} strokeWidth="2" />
      <circle cx="98" cy="100" r="25" fill="none" stroke={p.mid} strokeWidth="1.5" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={98 + Math.cos(a) * 15} cy={100 + Math.sin(a) * 15} r="6.5" fill={p.deep} stroke={p.dark} />;
      })}
      <circle cx="98" cy="100" r="5" fill={p.mid} stroke={p.dark} strokeWidth="1.5" />
    </g>
  );
}

function Clapper({ p }: { p: Palette }) {
  return (
    <g>
      <g transform="rotate(-14 74 86)">
        <rect x="72" y="74" width="58" height="12" rx="2" fill="#fff" stroke={p.deep} strokeWidth="1.6" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${78 + i * 13} 74 L${86 + i * 13} 74 L${80 + i * 13} 86 L${72 + i * 13} 86 Z`} fill="#1f1f1f" />
        ))}
      </g>
      <rect x="72" y="90" width="58" height="12" rx="1.5" fill="#fff" stroke={p.deep} strokeWidth="1.6" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${78 + i * 13} 90 L${86 + i * 13} 90 L${80 + i * 13} 102 L${72 + i * 13} 102 Z`} fill="#1f1f1f" />
      ))}
      <rect x="72" y="102" width="58" height="32" rx="2" fill="#262626" stroke={p.deep} strokeWidth="1.6" />
      <path d="M78 112 H124 M78 120 H112 M78 128 H118" stroke={p.light} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

function Manga({ p }: { p: Palette }) {
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((-160 + i * 17.5) * Math.PI) / 180;
        return (
          <path
            key={i}
            d={`M${100 + Math.cos(a) * 30} ${96 + Math.sin(a) * 30} L${100 + Math.cos(a) * 46} ${96 + Math.sin(a) * 46}`}
            stroke={p.light}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
        );
      })}
      <path d="M100 96 C88 88 74 88 64 92 V132 C74 128 88 128 100 136 Z" fill="#fff" stroke={p.deep} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M100 96 C112 88 126 88 136 92 V132 C126 128 112 128 100 136 Z" fill="#f4f4f4" stroke={p.deep} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="70" y="98" width="12" height="14" fill={p.dark} opacity="0.85" />
      <rect x="84" y="98" width="11" height="14" fill="none" stroke={p.dark} strokeWidth="1.2" />
      <rect x="70" y="115" width="25" height="10" fill="none" stroke={p.dark} strokeWidth="1.2" />
      <rect x="105" y="98" width="25" height="12" fill="none" stroke={p.dark} strokeWidth="1.2" />
      <rect x="105" y="113" width="11" height="12" fill={p.dark} opacity="0.85" />
      <rect x="118" y="113" width="12" height="12" fill="none" stroke={p.dark} strokeWidth="1.2" />
    </g>
  );
}

function Katanas({ p }: { p: Palette }) {
  const sword = (
    <g>
      <path d="M70 132 L134 66 L138 64 L136 68 L74 136 Z" fill="#f8fbff" stroke={p.deep} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M72 133 L135 66" stroke={p.mid} strokeWidth="0.9" />
      <ellipse cx="74" cy="132" rx="7" ry="3" transform="rotate(-45 74 132)" fill="#d4af37" stroke={p.deep} strokeWidth="1.2" />
      <path d="M58 150 L71 135 L74 138 L61 153 Z" fill="#1f1f2e" stroke={p.deep} strokeWidth="1.2" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${61 + i * 3.5} ${148 - i * 4} l4 3`} stroke={p.light} strokeWidth="1.2" />
      ))}
    </g>
  );
  return (
    <g>
      {sword}
      <g transform={`translate(${CX * 2} 0) scale(-1 1)`}>{sword}</g>
    </g>
  );
}

function Oni({ p }: { p: Palette }) {
  return (
    <g>
      <path d="M80 82 L72 58 L88 76 Z M120 82 L128 58 L112 76 Z" fill="#f5ecd7" stroke={p.deep} strokeWidth="1.4" strokeLinejoin="round" />
      <path
        d="M100 72 C122 72 132 88 130 108 C128 126 116 138 100 140 C84 138 72 126 70 108 C68 88 78 72 100 72 Z"
        fill="#e23b2e"
        stroke={p.deep}
        strokeWidth="1.8"
      />
      <path d="M78 94 L94 100 M122 94 L106 100" stroke="#2a0505" strokeWidth="4" strokeLinecap="round" />
      <path d="M80 102 Q87 96 94 104 Q87 108 80 102 Z M120 102 Q113 96 106 104 Q113 108 120 102 Z" fill="#fde68a" stroke="#2a0505" strokeWidth="1.2" />
      <path d="M96 108 L100 116 L104 108" fill="none" stroke="#2a0505" strokeWidth="1.6" />
      <path d="M82 120 Q100 136 118 120 Q100 128 82 120 Z" fill="#2a0505" />
      <path d="M86 121 L89 129 L92 123 Z M114 121 L111 129 L108 123 Z" fill="#fff" />
    </g>
  );
}

function Phoenix({ p }: { p: Palette }) {
  return (
    <g>
      <Mirror>
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={blade(96, 104, 40 - i * 5, -150 - i * 14, 5.5)}
            fill={i % 2 ? "#ffd56b" : "#ff8a3d"}
            stroke="#7a1d00"
            strokeWidth="1"
          />
        ))}
      </Mirror>
      {[0, -18, 18].map((d) => (
        <path key={d} d={blade(100, 118, 30, 90 + d, 5)} fill="#ff6a2b" stroke="#7a1d00" strokeWidth="1" />
      ))}
      <path d="M100 86 C108 92 108 112 100 124 C92 112 92 92 100 86 Z" fill="#ffcf4a" stroke="#7a1d00" strokeWidth="1.2" />
      <circle cx="100" cy="82" r="7" fill="#ffcf4a" stroke="#7a1d00" strokeWidth="1.2" />
      <path d="M100 75 C98 66 104 62 106 58 C106 66 108 70 104 76 Z" fill="#ff6a2b" stroke="#7a1d00" strokeWidth="0.8" />
      <path d="M100 86 L95 90 L100 89 Z" fill="#7a1d00" />
      <circle cx="102.5" cy="81" r="1.4" fill={p.deep} />
    </g>
  );
}

const ICONS: Record<Tier, (props: { p: Palette }) => React.ReactNode> = {
  Bronze: Popcorn,
  Silver: FilmReel,
  Gold: Clapper,
  Platinum: Manga,
  Diamond: Katanas,
  Master: Oni,
  Legend: Phoenix,
};

// ---------- the emblem ----------

export default function RankBadge({
  rank,
  size = "md",
}: {
  rank: Rank;
  size?: keyof typeof SIZES;
}) {
  const id = `rk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const tier = rank.tier;
  const p = PALETTES[tier];
  const px = SIZES[size];
  const Icon = ICONS[tier];
  const override = IMAGE_OVERRIDES[tier];
  const winged = tier === "Platinum" || tier === "Diamond" || tier === "Legend";

  if (override) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={override} alt={rank.name} width={px} height={px} className="shrink-0 object-contain" />;
  }

  return (
    <svg viewBox="0 0 200 200" width={px} height={px} role="img" aria-label={rank.name} className="shrink-0">
      <title>{rank.name}</title>
      <defs>
        <linearGradient id={`${id}-frame`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={p.light} />
          <stop offset="0.45" stopColor={p.mid} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={`${id}-bevel`} x1="0.8" y1="1" x2="0.2" y2="0">
          <stop offset="0" stopColor={p.light} />
          <stop offset="0.5" stopColor={p.mid} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <radialGradient id={`${id}-field`} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor={p.glow} />
          <stop offset="0.65" stopColor={p.dark} />
          <stop offset="1" stopColor={p.deep} />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.mid} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <radialGradient id={`${id}-rivet`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor={p.mid} />
          <stop offset="1" stopColor={p.deep} />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <polygon points={hex(52)} />
        </clipPath>
      </defs>

      {/* Ornaments behind the medallion */}
      {tier === "Legend" && <Halo />}
      {tier === "Master" && <Flames id={id} />}
      {tier === "Legend" && <Wings id={id} palette={GOLD} layers={3} />}
      {tier === "Platinum" && <Wings id={id} palette={PALETTES.Silver} layers={2} />}
      {tier === "Diamond" && <CrystalWings id={id} palette={p} />}
      {tier === "Master" && <Horns id={id} />}
      {tier === "Silver" && <Blades palette={p} />}
      {(tier === "Gold" || tier === "Master") && (
        <Laurel id={id} palette={GOLD} rise={tier === "Gold" ? 0 : 6} />
      )}

      {/* Medallion (smaller on winged tiers so the wings show) */}
      <g transform={winged ? `translate(${CX} ${CY}) scale(0.84) translate(${-CX} ${-CY})` : undefined}>
      <ellipse cx={CX} cy={CY + 66} rx="44" ry="6" fill="#000" opacity="0.35" />
      <polygon points={hex(66)} fill={`url(#${id}-frame)`} stroke={p.deep} strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={hex(59)} fill={`url(#${id}-bevel)`} stroke={p.deep} strokeOpacity="0.6" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={hex(53)} fill={`url(#${id}-field)`} stroke={p.deep} strokeWidth="2" strokeLinejoin="round" />

      {/* Light rays and a soft vignette inside the field */}
      <g clipPath={`url(#${id}-clip)`}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const d = (ang: number) => `${CX + Math.cos(ang) * 80} ${CY - 6 + Math.sin(ang) * 80}`;
          return <path key={i} d={`M${CX} ${CY - 6} L${d(a - 0.09)} L${d(a + 0.09)} Z`} fill={p.light} opacity="0.07" />;
        })}
        <polygon points={hex(53)} fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="6" />
      </g>

      {/* Rivets on the frame corners */}
      {hexVertices(62.5).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.8" fill={`url(#${id}-rivet)`} stroke={p.deep} strokeWidth="0.6" />
      ))}

      {/* Gloss on the upper frame */}
      <polygon
        points={hex(66)}
        fill={`url(#${id}-shine)`}
        transform={`translate(${CX} 60) scale(0.92 0.42) translate(${-CX} -60)`}
        opacity="0.6"
      />

      <g filter={`url(#${id}-shadow)`} transform="translate(0 -4)">
        <Icon p={p} />
      </g>

      </g>

      {/* Toppers */}
      {tier === "Silver" && <TopGem color="#93c5fd" y={36} />}
      {tier === "Gold" && <TopGem color="#ef4444" y={36} />}
      {tier === "Platinum" && <TopGem color="#5eead4" y={36} />}
      {tier === "Diamond" && <Diamond id={id} />}
      {tier === "Legend" && <Crown id={id} y={26} />}
      {(tier === "Diamond" || tier === "Legend") && (
        <Sparkles
          points={[
            [30, 40, 7],
            [172, 52, 6],
            [168, 160, 7],
            [34, 158, 5],
          ]}
        />
      )}

      {/* Division ribbon */}
      <g filter={`url(#${id}-shadow)`}>
        <path d="M58 150 L48 150 L54 160 L48 170 L70 170 Z" fill={p.dark} stroke={p.deep} strokeWidth="1" />
        <path d="M142 150 L152 150 L146 160 L152 170 L130 170 Z" fill={p.dark} stroke={p.deep} strokeWidth="1" />
        <path d="M60 146 H140 L136 166 H64 Z" fill={`url(#${id}-ribbon)`} stroke={p.deep} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M62 148.5 H138" stroke="rgb(255 255 255 / 0.45)" strokeWidth="1" />
        <text
          x={CX}
          y="161.5"
          textAnchor="middle"
          fontSize="15"
          fontWeight="900"
          letterSpacing="2"
          fill="#fff"
          stroke={p.deep}
          strokeWidth="2.5"
          paintOrder="stroke"
          fontFamily="var(--font-geist-sans), Arial, sans-serif"
        >
          {rank.division ?? "LEGEND"}
        </text>
      </g>
    </svg>
  );
}
