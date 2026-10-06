"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth, type Profile } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import RankBadge from "@/components/RankBadge";
import {
  acceptRequest,
  findUsers,
  listConnections,
  removeConnection,
  sendRequest,
  xpByUser,
  type Connection,
} from "@/lib/friends";
import { rankFor, TIER_STYLES } from "@/lib/ranks";

function SmallButton({
  onClick,
  kind = "primary",
  disabled,
  children,
}: {
  onClick?: () => void;
  kind?: "primary" | "ghost";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition disabled:opacity-50 ${
        kind === "primary"
          ? "bg-amber-400 text-black hover:bg-amber-300"
          : "border border-white/15 text-white/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function PersonRow({ profile, children }: { profile: Profile; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <Avatar username={profile.username} />
      <p className="min-w-0 flex-1 truncate font-semibold">@{profile.username}</p>
      {children}
    </div>
  );
}

export default function FriendsPage() {
  const { user, profile, loading } = useAuth();
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [xp, setXp] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Profile[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const list = await listConnections(user.id);
      const friendIds = list.filter((c) => c.relation === "friends").map((c) => c.profile.id);
      setXp(await xpByUser([user.id, ...friendIds]));
      setConnections(list);
    } catch {
      setFailed(true);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from Supabase
    reload();
  }, [reload]);

  // Search usernames as you type.
  useEffect(() => {
    if (!user || query.trim().replace(/^@/, "").length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      findUsers(query, user.id)
        .then((people) => !cancelled && setFound(people))
        .catch(() => {});
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user]);

  async function act(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
      await reload();
    } catch {
      alert("Something went wrong. Try again in a moment.");
    }
    setBusyId(null);
  }

  if (loading || (user && !connections && !failed)) {
    return <p className="py-24 text-center text-white/50">Loading friends…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-4xl font-black">Friends</h1>
        <p className="max-w-md text-white/60">
          Add friends, compare your Dex, and see who&apos;s ranked highest.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (failed || !connections) {
    return (
      <p className="py-24 text-center text-red-300">Couldn&apos;t load friends. Try refreshing.</p>
    );
  }

  const relationOf = (id: string) => connections.find((c) => c.profile.id === id)?.relation;
  const received = connections.filter((c) => c.relation === "received");
  const sent = connections.filter((c) => c.relation === "sent");
  const friends = connections.filter((c) => c.relation === "friends");

  // You plus your friends, highest XP first.
  const board = [
    ...(profile ? [{ profile, isMe: true }] : []),
    ...friends.map((f) => ({ profile: f.profile, isMe: false })),
  ].sort((a, b) => (xp[b.profile.id] ?? 0) - (xp[a.profile.id] ?? 0));

  const searching = query.trim().replace(/^@/, "").length >= 2;

  return (
    <div className="flex flex-col gap-8 py-8">
      <h1 className="text-4xl font-black">Friends</h1>

      <section className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find people by @username"
          className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-lg outline-none transition focus:border-amber-400"
        />
        {searching &&
          (found.length === 0 ? (
            <p className="px-1 text-sm text-white/50">No one with that username.</p>
          ) : (
            found.map((p) => {
              const relation = relationOf(p.id);
              return (
                <PersonRow key={p.id} profile={p}>
                  {relation === "friends" ? (
                    <span className="text-sm text-emerald-400">Friends ✓</span>
                  ) : relation === "sent" ? (
                    <span className="text-sm text-white/50">Requested</span>
                  ) : relation === "received" ? (
                    <SmallButton
                      disabled={busyId === p.id}
                      onClick={() => act(p.id, () => acceptRequest(p.id, user.id))}
                    >
                      Accept
                    </SmallButton>
                  ) : (
                    <SmallButton
                      disabled={busyId === p.id}
                      onClick={() => act(p.id, () => sendRequest(p.id))}
                    >
                      Add
                    </SmallButton>
                  )}
                </PersonRow>
              );
            })
          ))}
      </section>

      {received.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-black">
            Requests <span className="text-amber-400">{received.length}</span>
          </h2>
          {received.map((c) => (
            <PersonRow key={c.profile.id} profile={c.profile}>
              <SmallButton
                disabled={busyId === c.profile.id}
                onClick={() => act(c.profile.id, () => acceptRequest(c.profile.id, user.id))}
              >
                Accept
              </SmallButton>
              <SmallButton
                kind="ghost"
                disabled={busyId === c.profile.id}
                onClick={() => act(c.profile.id, () => removeConnection(c.profile.id, user.id))}
              >
                Decline
              </SmallButton>
            </PersonRow>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black">Your friends</h2>
        {friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-white/50">
            No friends yet. Search for someone&apos;s @username above to add them.
          </p>
        ) : (
          board.map(({ profile: p, isMe }, i) => {
            const rank = rankFor(xp[p.id] ?? 0);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isMe ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span className="w-5 text-center font-black text-white/40">{i + 1}</span>
                <Avatar username={p.username} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    @{p.username} {isMe && <span className="text-white/40">(you)</span>}
                  </p>
                  <p className={`text-xs font-bold ${TIER_STYLES[rank.tier].text}`}>
                    {rank.name} · {(xp[p.id] ?? 0).toLocaleString()} XP
                  </p>
                </div>
                <RankBadge rank={rank} size="sm" />
                {!isMe && (
                  <button
                    title="Remove friend"
                    disabled={busyId === p.id}
                    onClick={() =>
                      confirm(`Remove @${p.username} from your friends?`) &&
                      act(p.id, () => removeConnection(p.id, user.id))
                    }
                    className="px-1 text-white/30 hover:text-red-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
      </section>

      {sent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/50">Sent requests</h2>
          {sent.map((c) => (
            <PersonRow key={c.profile.id} profile={c.profile}>
              <SmallButton
                kind="ghost"
                disabled={busyId === c.profile.id}
                onClick={() => act(c.profile.id, () => removeConnection(c.profile.id, user.id))}
              >
                Cancel
              </SmallButton>
            </PersonRow>
          ))}
        </section>
      )}
    </div>
  );
}
