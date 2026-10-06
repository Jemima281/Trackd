"use client";

import { useState } from "react";
import type { MediaResult } from "@/lib/search";

const ICONS = { anime: "🌸", manga: "📖", movie: "🎬", tv: "📺", album: "💿" };

export default function MediaCard({ item }: { item: MediaResult }) {
  const [broken, setBroken] = useState(false);
  const square = item.type === "album";

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/5 ${
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
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</p>
        {item.subtitle && (
          <p className="truncate text-xs text-white/60">{item.subtitle}</p>
        )}
        <p className="truncate text-xs text-white/40">
          {[item.year, item.details].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}
