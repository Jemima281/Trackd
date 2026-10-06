import type { Profile } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

type Row = {
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
  created_at: string;
  requester_profile: Profile;
  addressee_profile: Profile;
};

export type Relation = "friends" | "sent" | "received";

export type Connection = { profile: Profile; relation: Relation; since: string };

// Every friendship and pending request involving this user, from their side.
export async function listConnections(userId: string): Promise<Connection[]> {
  const { data, error } = await createClient()
    .from("friendships")
    .select(
      "*, requester_profile:profiles!friendships_requester_fkey(*), addressee_profile:profiles!friendships_addressee_fkey(*)",
    );
  if (error) throw error;
  return (data as Row[]).map((r) => {
    const iSent = r.requester === userId;
    return {
      profile: iSent ? r.addressee_profile : r.requester_profile,
      relation: r.status === "accepted" ? "friends" : iSent ? "sent" : "received",
      since: r.created_at,
    };
  });
}

export async function findUsers(query: string, selfId: string) {
  const cleaned = query.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]+$/.test(cleaned)) return [];
  const { data, error } = await createClient()
    .from("profiles")
    .select("*")
    .ilike("username", `${cleaned}%`)
    .neq("id", selfId)
    .order("username")
    .limit(10);
  if (error) throw error;
  return data as Profile[];
}

export async function sendRequest(toId: string) {
  const { error } = await createClient().from("friendships").insert({ addressee: toId });
  if (error) throw error;
}

export async function acceptRequest(fromId: string, selfId: string) {
  const { error } = await createClient()
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester", fromId)
    .eq("addressee", selfId);
  if (error) throw error;
}

// Declines, cancels or unfriends — whichever direction the row was made in.
export async function removeConnection(otherId: string, selfId: string) {
  const { error } = await createClient()
    .from("friendships")
    .delete()
    .or(
      `and(requester.eq.${selfId},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${selfId})`,
    );
  if (error) throw error;
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await createClient()
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}
