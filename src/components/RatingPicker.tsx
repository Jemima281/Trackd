"use client";

import { cleanRating, formatRating, ratingColor } from "@/lib/rating";

// 0.0–10.0 rating: drag the slider, nudge with −/+ for tenths, or clear.
export default function RatingPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const shown = value ?? 5;
  const nudge = (by: number) => onChange(cleanRating((value ?? 5) + by));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">Your rating</span>
        {value !== null && (
          <button onClick={() => onChange(null)} className="text-xs text-white/40 hover:text-white">
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Lower rating by 0.1"
          onClick={() => nudge(-0.1)}
          className="h-11 w-11 shrink-0 rounded-full border border-white/15 text-xl text-white/70 hover:bg-white/10"
        >
          −
        </button>
        <p className="text-center">
          <span
            className={`text-5xl font-black tabular-nums ${
              value === null ? "text-white/20" : ratingColor(value)
            }`}
          >
            {value === null ? "–.–" : formatRating(value)}
          </span>
          <span className="text-lg font-bold text-white/30"> / 10</span>
        </p>
        <button
          type="button"
          aria-label="Raise rating by 0.1"
          onClick={() => nudge(0.1)}
          className="h-11 w-11 shrink-0 rounded-full border border-white/15 text-xl text-white/70 hover:bg-white/10"
        >
          +
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={shown}
        aria-label="Rating"
        onChange={(e) => onChange(cleanRating(Number(e.target.value)))}
        className={`rating-slider w-full ${value === null ? "opacity-40" : ""}`}
        style={{ "--fill": `${shown * 10}%` } as React.CSSProperties}
      />
      <div className="-mt-1 flex justify-between text-[10px] text-white/30">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
      {value === null && (
        <p className="-mt-1 text-center text-xs text-white/40">Drag to rate · optional</p>
      )}
    </div>
  );
}
