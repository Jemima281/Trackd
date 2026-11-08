"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth, type Profile } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import Leaderboard from "@/components/Leaderboard";
import LoadError, { describeError } from "@/components/LoadError";
import { listConnections } from "@/lib/friends";
import {
  addGroupMember,
  deleteGroup,
  getGroup,
  getGroupLeaderboard,
  getGroupMembers,
  GROUP_EMOJIS,
  inviteLink,
  leaveGroup,
  removeGroupMember,
  updateGroup,
  type Group,
} from "@/lib/groups";
import type { MediaType } from "@/lib/categories";
import { shownName } from "@/lib/profile";
import type { Period } from "@/lib/stats";

type Member = { joined_at: string; profile: Profile };

export default function GroupView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [group, setGroup] = useState<Group | null | "missing">(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const g = await getGroup(id);
      if (!g) return setGroup("missing");
      const [m, connections] = await Promise.all([getGroupMembers(id), listConnections(user.id)]);
      setGroup(g);
      setMembers(m);
      setFriends(connections.filter((c) => c.relation === "friends").map((c) => c.profile));
    } catch (err) {
      setError(describeError(err));
    }
  }, [id, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from Supabase
    reload();
  }, [reload]);

  const loadBoard = useCallback(
    (period: Period, category: MediaType | null, genre: string | null) =>
      getGroupLeaderboard(id, period, category, genre),
    [id],
  );

  async function act(action: () => Promise<unknown>, then?: () => void) {
    setBusy(true);
    try {
      await action();
      if (then) then();
      else await reload();
    } catch (err) {
      alert(describeError(err));
    }
    setBusy(false);
  }

  async function invite(g: Group) {
    const url = inviteLink(g);
    try {
      if (navigator.share) await navigator.share({ title: `Join ${g.name} on Shuin`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet closed.
    }
  }

  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-black">Log in to see this group</h1>
        <Link href="/login" className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black">
          Log in
        </Link>
      </div>
    );
  }
  if (error) return <LoadError what="this group" detail={error} />;
  if (group === null || !user) return <p className="py-24 text-center text-white/50">Loading group…</p>;
  if (group === "missing") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="text-2xl font-black">Group not found</h1>
        <p className="text-white/50">It was deleted, or you&apos;re not a member.</p>
        <Link href="/friends" className="text-amber-400 hover:underline">
          Back to friends
        </Link>
      </div>
    );
  }

  const isOwner = group.owner === user.id;
  const memberIds = new Set(members.map((m) => m.profile.id));
  const addable = friends.filter((f) => !memberIds.has(f.id));
  const pill = "rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link href="/friends" className="text-sm text-white/50 hover:text-white">
        ← Friends
      </Link>

      <section className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-5 py-8 text-center">
        {editing ? (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center outline-none focus:border-amber-400"
            />
            <div className="flex flex-wrap justify-center gap-1.5">
              {GROUP_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`h-10 w-10 rounded-xl border text-xl ${
                    emoji === e ? "border-amber-400 bg-amber-400/10" : "border-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <button
                disabled={busy || !name.trim()}
                onClick={() => act(() => updateGroup(id, name.trim(), emoji), () => { setEditing(false); reload(); })}
                className={`${pill} bg-amber-400 text-black`}
              >
                Save
              </button>
              <button onClick={() => setEditing(false)} className={`${pill} text-white/60`}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="text-5xl">{group.emoji ?? "👥"}</span>
            <h1 className="text-3xl font-black">{group.name}</h1>
            <p className="text-sm text-white/50">
              {members.length} member{members.length === 1 ? "" : "s"}
            </p>
          </>
        )}
        {!editing && (
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => invite(group)} className={`${pill} bg-amber-400 text-black hover:bg-amber-300`}>
              {copied ? "Link copied!" : "🔗 Invite link"}
            </button>
            <button onClick={() => setAdding((a) => !a)} className={`${pill} border border-white/15 hover:bg-white/10`}>
              + Add friends
            </button>
            {isOwner && (
              <button
                onClick={() => {
                  setName(group.name);
                  setEmoji(group.emoji);
                  setEditing(true);
                }}
                className={`${pill} border border-white/15 hover:bg-white/10`}
              >
                Edit
              </button>
            )}
          </div>
        )}
      </section>

      {adding && (
        <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="font-bold">Add friends</h2>
          {addable.length === 0 ? (
            <p className="text-sm text-white/50">
              All your friends are already here. Share the invite link to bring in others.
            </p>
          ) : (
            addable.map((f) => (
              <div key={f.id} className="flex items-center gap-3">
                <Avatar username={f.username} url={f.avatar_url} />
                <span className="min-w-0 flex-1 truncate">{shownName(f)}</span>
                <button
                  disabled={busy}
                  onClick={() => act(() => addGroupMember(id, f.id))}
                  className={`${pill} bg-amber-400 py-1.5 text-black`}
                >
                  Add
                </button>
              </div>
            ))
          )}
        </section>
      )}

      <Leaderboard title="Group leaderboard" load={loadBoard} reloadKey={members.length} meId={user.id} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-black">Members</h2>
        {members.map((m) => (
          <div key={m.profile.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <Link href={`/u/${m.profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar username={m.profile.username} url={m.profile.avatar_url} />
              <span className="truncate font-semibold">{shownName(m.profile)}</span>
              {m.profile.id === group.owner && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/60">
                  Owner
                </span>
              )}
            </Link>
            {isOwner && m.profile.id !== user.id && (
              <button
                title="Remove from group"
                disabled={busy}
                onClick={() =>
                  confirm(`Remove ${shownName(m.profile)} from ${group.name}?`) &&
                  act(() => removeGroupMember(id, m.profile.id))
                }
                className="px-1 text-white/30 hover:text-red-300"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </section>

      <div className="flex justify-center gap-3 border-t border-white/10 pt-6">
        <button
          disabled={busy}
          onClick={() =>
            confirm(`Leave ${group.name}?`) && act(() => leaveGroup(id), () => router.push("/friends"))
          }
          className={`${pill} border border-white/15 text-white/70 hover:bg-white/10`}
        >
          Leave group
        </button>
        {isOwner && (
          <button
            disabled={busy}
            onClick={() =>
              confirm(`Delete ${group.name} for everyone? This can't be undone.`) &&
              act(() => deleteGroup(id), () => router.push("/friends"))
            }
            className={`${pill} text-red-300 hover:bg-red-400/10`}
          >
            Delete group
          </button>
        )}
      </div>
    </div>
  );
}
