"use client";

import { useState } from "react";
import { statusLabel, STATUS_STYLES, type Entry } from "@/lib/entries";
import type { MediaResult } from "@/lib/search";

const ICONS = { anime: "🌸", manga: "📖", movie: "🎬", tv: "📺", album: "💿" };

export default function MediaCard({
  item,
  entry,
  onClick,
}: {
  item: MediaResult;
  entry?: Entry | null;
  onClick?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const square = item.type === "album";

  return (
    <button onClick={onClick} className="group flex flex-col gap-2 text-left">
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 transition group-hover:border-amber-400/60 ${
          square ? "aspect-square" : "aspect-[2/3]"
        }`}
      >
        {item.cover && !broken ? (
          // Covers come from many hosts, so a plain <img> is simpler than next/image here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-40">
            {ICONS[item.type]}
          </div>
        )}
        {entry && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[entry.status].badge}`}
          >
            {statusLabel(entry.status, item.type)}
          </span>
        )}
        {entry?.rating && (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/80 px-2 py-0.5 text-xs font-bold text-amber-400">
            ★ {entry.rating}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</p>
        {item.subtitle && <p className="truncate text-xs text-white/60">{item.subtitle}</p>}
        <p className="truncate text-xs text-white/40">
          {[item.year, item.details].filter(Boolean).join(" · ")}
        </p>
      </div>
    </button>
  );
}
