"use client";

import Link from "next/link";
import { useState } from "react";
import type { DayXp } from "@/lib/statistics";

// Small single-series charts in the app's amber. Bars are ≤24px with 4px
// rounded data-ends on a shared baseline; grid and axis text stay recessive;
// tapping or hovering a mark shows its value in the readout line above.

const ACCENT = "#fbbf24";

function Readout({ text, idle }: { text: string | null; idle: string }) {
  return (
    <p className={`h-5 text-xs tabular-nums ${text ? "text-white" : "text-white/40"}`}>{text ?? idle}</p>
  );
}

// Vertical columns, one per label (months, score buckets…).
export function ColumnChart({
  data,
  format,
  label,
  idle = "Tap a bar for details",
  height = 120,
}: {
  data: { label: string; value: number; tick?: string }[];
  format: (d: { label: string; value: number }) => string;
  label: string; // accessible name
  idle?: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="flex flex-col gap-2" aria-label={label}>
      <Readout text={active === null ? null : format(data[active])} idle={idle} />
      <div className="relative" style={{ height }} onMouseLeave={() => setActive(null)}>
        {/* recessive grid: baseline + half + top */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-white/[0.07]" style={{ bottom: f * height }} />
        ))}
        <div className="absolute inset-0 flex items-end">
          {data.map((d, i) => (
            <button
              key={d.label}
              type="button"
              aria-label={format(d)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="group flex h-full flex-1 items-end justify-center px-[1px] outline-none"
            >
              <span
                className="w-full max-w-6 rounded-t-[4px] transition-opacity"
                style={{
                  height: d.value > 0 ? Math.max(3, (d.value / max) * height) : 0,
                  background: ACCENT,
                  opacity: active === null || active === i ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex text-[10px] text-white/40">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center">
            {d.tick ?? d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

// Horizontal labelled bars, largest first (genres, statuses, categories…).
export function BarList({
  data,
  format = (v) => v.toLocaleString(),
}: {
  data: { label: string; value: number; icon?: string; href?: string }[];
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="py-4 text-sm text-white/40">Nothing yet.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => {
        const row = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-white/80">
                {d.icon && <span className="mr-1.5">{d.icon}</span>}
                {d.label}
              </span>
              <span className="shrink-0 tabular-nums text-white/60">{format(d.value)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/[0.06]">
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: ACCENT }}
              />
            </div>
          </>
        );
        return (
          <li key={d.label}>
            {d.href ? (
              <Link
                href={d.href}
                className="-m-1 flex flex-col gap-1.5 rounded-lg p-1 transition hover:bg-white/[0.04]"
              >
                {row}
              </Link>
            ) : (
              <div className="flex flex-col gap-1.5">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Last 26 weeks of activity, one square per day (Mon–Sun rows), darker = less.
const LEVELS = ["rgb(255 255 255 / 0.06)", "#4a3810", "#8a6512", "#c99317", ACCENT];

export function Heatmap({ days, weeks = 26 }: { days: DayXp[]; weeks?: number }) {
  const [active, setActive] = useState<string | null>(null);
  const byDay = new Map(days.map((d) => [d.day, d.xp]));
  const values = days.map((d) => d.xp).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p: number) => values[Math.floor(p * (values.length - 1))] ?? 0;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (xp: number) => (xp <= 0 ? 0 : xp <= cuts[0] ? 1 : xp <= cuts[1] ? 2 : xp <= cuts[2] ? 3 : 4);

  // Start on the Monday `weeks` weeks ago (UTC, matching the database days).
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const weekday = (new Date(todayUtc).getUTCDay() + 6) % 7; // Monday = 0
  const start = todayUtc - (weekday + (weeks - 1) * 7) * 86_400_000;

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const t = start + (w * 7 + d) * 86_400_000;
      const iso = new Date(t).toISOString().slice(0, 10);
      return t > todayUtc ? null : { iso, xp: byDay.get(iso) ?? 0 };
    }),
  );
  const activeXp = active ? (byDay.get(active) ?? 0) : 0;
  const label = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <figure className="flex flex-col gap-2" aria-label="Activity over the last 26 weeks">
      <Readout
        text={active ? `${label(active)} · ${activeXp ? `${activeXp.toLocaleString()} XP` : "no activity"}` : null}
        idle="Tap a day for details"
      />
      <div className="flex gap-[3px]" onMouseLeave={() => setActive(null)}>
        {columns.map((col, w) => (
          <div key={w} className="flex flex-1 flex-col gap-[3px]">
            {col.map((cell, d) =>
              cell ? (
                <button
                  key={d}
                  type="button"
                  aria-label={`${label(cell.iso)}: ${cell.xp} XP`}
                  onMouseEnter={() => setActive(cell.iso)}
                  onClick={() => setActive(cell.iso)}
                  className={`aspect-square w-full rounded-[3px] outline-none ${active === cell.iso ? "ring-1 ring-white" : ""}`}
                  style={{ background: LEVELS[level(cell.xp)] }}
                />
              ) : (
                <span key={d} className="aspect-square w-full" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-white/40">
        Less
        {LEVELS.map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
        ))}
        More
      </div>
    </figure>
  );
}
