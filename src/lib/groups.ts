import type { Profile } from "@/components/AuthProvider";
import type { MediaType } from "@/lib/categories";
import type { LeaderboardRow, Period } from "@/lib/stats";
import { createClient } from "@/lib/supabase/client";

// Friend groups. Reads go straight to the tables (members only, enforced by
// the database); every change goes through a database function that checks
// permissions. See supabase/migrations/0010_categories_groups_stats.sql.

export type Group = {
  id: string;
  name: string;
  emoji: string | null;
  owner: string;
  invite_code: string;
  created_at: string;
};

export type GroupWithCount = Group & { members: number };

export const GROUP_EMOJIS = ["🍥", "🎬", "📚", "⚔️", "🔥", "👾", "🌸", "🐉", "🍿", "🏆", "🎮", "🌙"];

const db = () => createClient();

async function call<T = void>(fn: string, args: object): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export async function listMyGroups(): Promise<GroupWithCount[]> {
  const { data, error } = await db()
    .from("groups")
    .select("*, group_members(count)")
    .order("created_at");
  if (error) throw error;
  return (data as (Group & { group_members: { count: number }[] })[]).map(({ group_members, ...g }) => ({
    ...g,
    members: group_members?.[0]?.count ?? 0,
  }));
}

export async function getGroup(id: string) {
  const { data, error } = await db().from("groups").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Group | null;
}

export async function getGroupMembers(id: string) {
  const { data, error } = await db()
    .from("group_members")
    .select("joined_at, profile:profiles(*)")
    .eq("group_id", id)
    .order("joined_at");
  if (error) throw error;
  return (data as unknown as { joined_at: string; profile: Profile }[]).map((m) => ({
    ...m,
    profile: { ...m.profile, favorites: m.profile.favorites ?? [] },
  }));
}

export const createGroup = (name: string, emoji: string | null) =>
  call<string>("create_group", { group_name: name, group_emoji: emoji });
export const updateGroup = (id: string, name: string, emoji: string | null) =>
  call("update_group", { gid: id, group_name: name, group_emoji: emoji });
export const addGroupMember = (id: string, userId: string) => call("add_group_member", { gid: id, member: userId });
export const removeGroupMember = (id: string, userId: string) =>
  call("remove_group_member", { gid: id, member: userId });
export const leaveGroup = (id: string) => call("leave_group", { gid: id });
export const deleteGroup = (id: string) => call("delete_group", { gid: id });
export const joinGroup = (code: string) => call<string>("join_group", { code });

export async function previewGroup(code: string) {
  const rows = await call<{ id: string; name: string; emoji: string | null; members: number }[]>(
    "group_preview",
    { code },
  );
  return rows[0] ? { ...rows[0], members: Number(rows[0].members) } : null;
}

export async function getGroupLeaderboard(
  id: string,
  period: Period,
  category: MediaType | null,
  genre: string | null = null,
) {
  const rows = await call<LeaderboardRow[]>("group_leaderboard", { gid: id, period, category, genre });
  return rows.map((r) => ({ ...r, xp: Number(r.xp) }));
}

export function inviteLink(group: Pick<Group, "invite_code">) {
  return `${window.location.origin}/groups/join/${group.invite_code}`;
}
