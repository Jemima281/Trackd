"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth, type Profile } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import LoadError, { describeError } from "@/components/LoadError";
import RankBadge from "@/components/RankBadge";
import {
  acceptRequest,
  findUsers,
  listConnections,
  removeConnection,
  sendRequest,
  type Connection,
} from "@/lib/friends";
import { CATEGORY_SCALE, rankFor } from "@/lib/ranks";
import type { MediaType } from "@/lib/search";
import { getLeaderboard, type LeaderboardRow, type Period } from "@/lib/stats";

const CATEGORIES: { type: MediaType | null; label: string }[] = [
  { type: null, label: "Everything" },
  { type: "anime", label: "Anime" },
  { type: "manga", label: "Manga" },
  { type: "movie", label: "Movies" },
  { type: "tv", label: "TV" },
  { type: "album", label: "Music" },
];

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-amber-400 text-black" : "border border-white/15 text-white/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

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
      <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar username={profile.username} />
        <p className="truncate font-semibold hover:underline">@{profile.username}</p>
      </Link>
      {children}
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardItem({
  place,
  row,
  isMe,
  scale,
  busy,
  onRemove,
}: {
  place: number;
  row: LeaderboardRow;
  isMe: boolean;
  scale: number | null; // null hides the rank badge
  busy: boolean;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        isMe ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      {row.xp > 0 && place <= 3 ? (
        <span className="w-6 text-center text-xl">{MEDALS[place - 1]}</span>
      ) : (
        <span className="w-6 text-center font-black text-white/40">{place}</span>
      )}
      <Link href={`/u/${row.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar username={row.username} />
        <div className="min-w-0">
          <p className="truncate font-semibold hover:underline">
            @{row.username} {isMe && <span className="text-white/40">(you)</span>}
          </p>
          <p className="text-xs font-bold text-amber-400">{row.xp.toLocaleString()} XP</p>
        </div>
      </Link>
      {scale !== null && <RankBadge rank={rankFor(row.xp, scale)} size="sm" />}
      {onRemove && (
        <button
          title="Remove friend"
          disabled={busy}
          onClick={onRemove}
          className="px-1 text-white/30 hover:text-red-300"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [category, setCategory] = useState<MediaType | null>(null);
  const [board, setBoard] = useState<LeaderboardRow[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Profile[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      setConnections(await listConnections(user.id));
    } catch (err) {
      setFailed(describeError(err));
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from Supabase
    reload();
  }, [reload]);

  // Reload the leaderboard when the filters or friends list change.
  useEffect(() => {
    if (!user || !connections) return;
    let cancelled = false;
    getLeaderboard(period, category)
      .then((rows) => {
        if (cancelled) return;
        setBoard(rows);
        setBoardError(null);
      })
      .catch((err) => !cancelled && setBoardError(describeError(err)));
    return () => {
      cancelled = true;
    };
  }, [user, connections, period, category]);

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
    return <LoadError what="friends" detail={failed ?? ""} />;
  }

  const relationOf = (id: string) => connections.find((c) => c.profile.id === id)?.relation;
  const received = connections.filter((c) => c.relation === "received");
  const sent = connections.filter((c) => c.relation === "sent");
  const friends = connections.filter((c) => c.relation === "friends");

  // Badges show all-time rank (in the chosen category); weekly XP isn't a rank.
  const scale = category ? CATEGORY_SCALE[category] : 1;

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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Leaderboard</h2>
          <div className="flex gap-1 rounded-full border border-white/10 p-1">
            {(["week", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  period === p ? "bg-white text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {p === "week" ? "This week" : "All time"}
              </button>
            ))}
          </div>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.map((c) => (
            <Toggle key={c.label} active={category === c.type} onClick={() => setCategory(c.type)}>
              {c.label}
            </Toggle>
          ))}
        </div>
        {period === "week" && (
          <p className="text-xs text-white/40">XP earned since Monday. Resets every week.</p>
        )}

        {boardError ? (
          <p className="break-words rounded-xl bg-white/5 px-4 py-3 text-center font-mono text-xs text-red-300/80">
            Couldn&apos;t load the leaderboard: {boardError}
          </p>
        ) : !board ? (
          <p className="py-8 text-center text-white/50">Loading…</p>
        ) : (
          board.map((row, i) => {
            const isMe = row.user_id === user.id;
            const friend = friends.find((f) => f.profile.id === row.user_id);
            return (
              <LeaderboardItem
                key={row.user_id}
                place={i + 1}
                row={row}
                isMe={isMe}
                scale={period === "all" ? scale : null}
                busy={busyId === row.user_id}
                onRemove={
                  friend
                    ? () =>
                        confirm(`Remove @${row.username} from your friends?`) &&
                        act(row.user_id, () => removeConnection(row.user_id, user.id))
                    : undefined
                }
              />
            );
          })
        )}

        {friends.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-white/50">
            It&apos;s lonely up here. Search for someone&apos;s @username above to add them.
          </p>
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
