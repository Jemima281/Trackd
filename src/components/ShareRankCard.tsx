"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/components/AuthProvider";
import RankBadge from "@/components/RankBadge";
import { CATEGORIES } from "@/lib/categories";
import { BANNERS, type Banner } from "@/lib/profile";
import { CATEGORY_SCALE, rankFor } from "@/lib/ranks";
import type { XpByType } from "@/lib/stats";

// A story-sized (1080×1920) image of someone's ranks, drawn as SVG in the page,
// turned into a PNG in the browser, then shared or saved.

const W = 1080;
const H = 1920;
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Same fallback colours as <Avatar> for people without a photo.
const FALLBACK = ["#f472b6", "#a78bfa", "#f87171", "#38bdf8", "#34d399", "#fbbf24"];
const BANNER_HEX: Record<Banner, [string, string]> = {
  sunset: ["#f97316", "#7e22ce"], ocean: ["#22d3ee", "#3730a3"], forest: ["#a3e635", "#134e4a"],
  grape: ["#d946ef", "#312e81"], gold: ["#fde68a", "#9a3412"], crimson: ["#fb7185", "#450a0a"],
  midnight: ["#475569", "#020617"], aurora: ["#6ee7b7", "#7c3aed"],
};

function fallbackColor(username: string) {
  const hash = [...username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return FALLBACK[hash % FALLBACK.length];
}

// An exported image can't load anything from the web, so the profile photo
// is fetched and embedded as data. Null if there's no photo or it fails.
async function photoAsData(url: string | null) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function Card({
  svgRef,
  profile,
  photo,
  byType,
  hours,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  profile: Profile;
  photo: string | null;
  byType: XpByType;
  hours: number;
}) {
  const xp = Object.values(byType).reduce((a, b) => a + b, 0);
  const rank = rankFor(xp);
  const [from, to] = BANNER_HEX[(profile.banner as Banner) in BANNERS ? (profile.banner as Banner) : "midnight"];
  const name = profile.display_name || `@${profile.username}`;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="card-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14141c" />
          <stop offset="1" stopColor="#07070b" />
        </linearGradient>
        <linearGradient id="card-banner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id="card-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#14141c" stopOpacity="0" />
          <stop offset="1" stopColor="#14141c" stopOpacity="1" />
        </linearGradient>
        <clipPath id="card-avatar">
          <circle cx={W / 2} cy="400" r="92" />
        </clipPath>
        <radialGradient id="card-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#card-bg)" />
      <rect width={W} height="560" fill="url(#card-banner)" opacity="0.9" />
      <rect width={W} height="560" fill="url(#card-fade)" />

      {/* Logo */}
      <rect x="72" y="72" width="64" height="64" rx="12" fill="#d63027" />
      <text x="104" y="116" textAnchor="middle" fontSize="38" fontWeight="900" fill="#fff6ec" fontFamily={FONT}>
        朱
      </text>
      <text x="152" y="118" fontSize="46" fontWeight="900" fill="#fff" fontFamily={FONT}>
        shuin
      </text>

      {/* Avatar and name */}
      <circle cx={W / 2} cy="400" r="104" fill="#07070b" />
      {photo ? (
        <image
          href={photo}
          x={W / 2 - 92}
          y="308"
          width="184"
          height="184"
          clipPath="url(#card-avatar)"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle cx={W / 2} cy="400" r="92" fill={fallbackColor(profile.username)} />
          <text x={W / 2} y="434" textAnchor="middle" fontSize="96" fontWeight="900" fill="#000" fontFamily={FONT}>
            {profile.username[0].toUpperCase()}
          </text>
        </>
      )}
      <text x={W / 2} y="580" textAnchor="middle" fontSize="64" fontWeight="900" fill="#fff" fontFamily={FONT}>
        {name.length > 22 ? `${name.slice(0, 21)}…` : name}
      </text>
      {profile.display_name && (
        <text x={W / 2} y="634" textAnchor="middle" fontSize="36" fill="#ffffff80" fontFamily={FONT}>
          @{profile.username}
        </text>
      )}

      {/* Overall rank */}
      <circle cx={W / 2} cy="900" r="300" fill="url(#card-glow)" />
      <g transform={`translate(${W / 2 - 230} 670) scale(${460 / 170})`}>
        <RankBadge rank={rank} size="lg" />
      </g>
      <text x={W / 2} y="1190" textAnchor="middle" fontSize="96" fontWeight="900" fill="#fff" fontFamily={FONT}>
        {rank.name}
      </text>
      <text x={W / 2} y="1260" textAnchor="middle" fontSize="42" fontWeight="700" fill="#fbbf24" fontFamily={FONT}>
        {xp.toLocaleString()} XP · {Math.round(hours).toLocaleString()} hours
      </text>

      {/* Category ranks, two columns */}
      {CATEGORIES.map((c, i) => {
        const r = rankFor(byType[c.type], CATEGORY_SCALE[c.type]);
        const x = i % 2 === 0 ? 90 : 560;
        const y = 1330 + Math.floor(i / 2) * 150;
        return (
          <g key={c.type}>
            <rect x={x} y={y} width="430" height="130" rx="28" fill="#ffffff0d" stroke="#ffffff1a" />
            <g transform={`translate(${x + 14} ${y + 13}) scale(${104 / 72})`}>
              <RankBadge rank={r} category={c.type} size="md" />
            </g>
            <text x={x + 138} y={y + 58} fontSize="34" fontWeight="800" fill="#fff" fontFamily={FONT}>
              {c.label}
            </text>
            <text x={x + 138} y={y + 100} fontSize="30" fontWeight="700" fill="#ffffffaa" fontFamily={FONT}>
              {r.name}
            </text>
          </g>
        );
      })}

      {/* Call to action */}
      <text x={W / 2} y="1830" textAnchor="middle" fontSize="40" fontWeight="800" fill="#fff" fontFamily={FONT}>
        What rank are you?
      </text>
      <text x={W / 2} y="1880" textAnchor="middle" fontSize="34" fontWeight="700" fill="#fbbf24" fontFamily={FONT}>
        shuin.io
      </text>
    </svg>
  );
}

// Turn the rendered SVG into a PNG file.
async function toPng(svg: SVGSVGElement): Promise<Blob> {
  const markup = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't draw the card"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.getContext("2d")!.drawImage(img, 0, 0, W, H);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't save the card"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ShareRankCard({
  profile,
  byType,
  hours,
}: {
  profile: Profile;
  byType: XpByType;
  hours: number;
}) {
  const [open, setOpen] = useState(false);
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined while loading the photo, then its data (or null).
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    photoAsData(profile.avatar_url).then((data) => !cancelled && setPhoto(data));
    return () => {
      cancelled = true;
      setPhoto(undefined);
    };
  }, [open, profile.avatar_url]);

  // Draw the PNG once the photo is ready and the hidden SVG has rendered.
  useEffect(() => {
    if (!open || photo === undefined) return;
    let cancelled = false;
    let url: string | null = null;
    const timer = setTimeout(async () => {
      try {
        const blob = await toPng(svgRef.current!);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPng({ blob, url });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
      setPng(null);
      setError(null);
    };
  }, [open, photo]);

  const file = png ? new File([png.blob], `shuin-${profile.username}.png`, { type: "image/png" }) : null;
  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: "What rank are you? shuin.io" });
    } catch {
      // Share sheet closed — nothing to do.
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300"
      >
        📸 Share my rank
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Share your rank"
            className="flex max-h-full w-full max-w-sm flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawn off-screen, then converted to an image. */}
            <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
              {photo !== undefined && (
                <Card svgRef={svgRef} profile={profile} photo={photo} byType={byType} hours={hours} />
              )}
            </div>

            {png ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={png.url}
                alt="Your rank card"
                className="max-h-[65vh] w-auto rounded-2xl border border-white/10 shadow-2xl"
              />
            ) : (
              <div className="flex aspect-[9/16] max-h-[65vh] w-full items-center justify-center rounded-2xl border border-white/10 text-sm text-white/50">
                {error ?? "Making your card…"}
              </div>
            )}

            <div className="flex w-full flex-col gap-2">
              {canShareFile && (
                <button
                  onClick={share}
                  className="rounded-full bg-amber-400 py-3 font-bold text-black hover:bg-amber-300"
                >
                  Share
                </button>
              )}
              {png && (
                <a
                  href={png.url}
                  download={`shuin-${profile.username}.png`}
                  className={`rounded-full py-3 text-center font-bold ${
                    canShareFile
                      ? "border border-white/15 text-white/80 hover:bg-white/10"
                      : "bg-amber-400 text-black hover:bg-amber-300"
                  }`}
                >
                  Save image
                </a>
              )}
              <button onClick={() => setOpen(false)} className="py-2 text-sm text-white/50 hover:text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
