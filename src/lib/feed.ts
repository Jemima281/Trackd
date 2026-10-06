import type { Status } from "@/lib/entries";
import type { MediaType } from "@/lib/search";
import { createClient } from "@/lib/supabase/client";

export type FeedItem = {
  id: number;
  username: string;
  media_key: string;
  media_type: MediaType;
  title: string;
  subtitle: string | null;
  cover: string | null;
  old_status: Status | null;
  status: Status;
  rating: number | null;
  progress_delta: number;
  progress: number;
  total_units: number | null;
  created_at: string;
};

export async function getFeed(before?: string) {
  const { data, error } = await createClient().rpc("feed", {
    before: before ?? new Date().toISOString(),
    max_rows: 30,
  });
  if (error) throw error;
  return data as FeedItem[];
}

const VERBS: Record<MediaType, { doing: string; did: string; plan: string; unit: string }> = {
  anime: { doing: "watching", did: "watched", plan: "watch", unit: "episode" },
  tv: { doing: "watching", did: "watched", plan: "watch", unit: "episode" },
  movie: { doing: "watching", did: "watched", plan: "watch", unit: "" },
  manga: { doing: "reading", did: "read", plan: "read", unit: "chapter" },
  album: { doing: "listening to", did: "listened to", plan: "listen to", unit: "track" },
};

// The verb phrase before the title, e.g. "completed", "watched 5 episodes of".
export function describeAction(item: FeedItem) {
  const v = VERBS[item.media_type];
  switch (item.status) {
    case "completed":
      return item.old_status === "completed" ? "rated" : "completed";
    case "dropped":
      return "dropped";
    case "planning":
      return `wants to ${v.plan}`;
    case "in_progress":
      if (item.progress_delta > 0 && v.unit && item.old_status === "in_progress") {
        const n = item.progress_delta;
        return `${v.did} ${n} ${v.unit}${n === 1 ? "" : "s"} of`;
      }
      return item.old_status === "in_progress" ? "rated" : `started ${v.doing}`;
  }
}

export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60 * 60 * 24 * 7, "w"],
    [60 * 60 * 24, "d"],
    [60 * 60, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label}`;
  }
  return "just now";
}
