import type { Profile } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

// Keep these lists in sync with the checks in supabase/migrations/0008_ratings_profiles.sql.

export const BANNERS = {
  sunset: { label: "Sunset", className: "bg-gradient-to-br from-orange-500 via-pink-500 to-purple-700" },
  ocean: { label: "Ocean", className: "bg-gradient-to-br from-cyan-400 via-sky-600 to-indigo-800" },
  forest: { label: "Forest", className: "bg-gradient-to-br from-lime-400 via-emerald-600 to-teal-900" },
  grape: { label: "Grape", className: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-900" },
  gold: { label: "Gold", className: "bg-gradient-to-br from-yellow-200 via-amber-500 to-orange-800" },
  crimson: { label: "Crimson", className: "bg-gradient-to-br from-rose-400 via-red-600 to-red-950" },
  midnight: { label: "Midnight", className: "bg-gradient-to-br from-slate-600 via-slate-800 to-black" },
  aurora: { label: "Aurora", className: "bg-gradient-to-br from-emerald-300 via-cyan-500 to-violet-600" },
} as const;

export type Banner = keyof typeof BANNERS;

export const MAX_FAVORITES = 4;

export type ProfileEdits = Pick<
  Profile,
  "display_name" | "bio" | "avatar_url" | "banner" | "favorites"
>;

export async function updateProfile(userId: string, edits: ProfileEdits) {
  const { error } = await createClient()
    .from("profiles")
    .update({
      ...edits,
      display_name: edits.display_name?.trim() || null,
      bio: edits.bio?.trim() || null,
    })
    .eq("id", userId);
  if (error) throw error;
}

// The name to show big: display name if set, otherwise @username.
export function shownName(p: Pick<Profile, "username" | "display_name">) {
  return p.display_name || `@${p.username}`;
}
