import type { Status } from "@/lib/entries";
import type { MediaResult } from "@/lib/search";

export type ImportItem = {
  media: MediaResult;
  status: Status;
  rating: number | null; // 1–10
  progress: number; // episodes/chapters/tracks done
  date: string | null; // ISO date of completion or last update, if known
};

export type ImportResult = {
  items: ImportItem[];
  unmatched: string[]; // titles we couldn't find
};

export type OnProgress = (done: number, total: number) => void;

// Fit an item to what the database accepts and what makes sense.
export function tidy(item: ImportItem): ImportItem {
  const total = item.media.totalUnits ?? null;
  let progress = Math.max(0, Math.min(Math.round(item.progress) || 0, 20000));
  if (item.media.type === "movie") progress = item.status === "completed" ? 1 : 0;
  else if (item.status === "completed" && total) progress = total;
  if (total) progress = Math.min(progress, total);
  const rating =
    item.rating && item.rating >= 1 ? Math.min(10, Math.max(1, Math.round(item.rating))) : null;
  const minutes = item.media.unitMinutes;
  return {
    ...item,
    progress,
    rating,
    media: {
      ...item.media,
      totalUnits: total && total <= 20000 ? total : null,
      unitMinutes: minutes && minutes > 0 ? Math.min(minutes, 400) : null,
    },
  };
}

// Split a list into chunks of `size`.
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
