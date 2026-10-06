"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth, type Profile } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import DexBrowser from "@/components/DexBrowser";
import LoadError, { describeError } from "@/components/LoadError";
import RankOverview from "@/components/RankOverview";
import { listEntries, type Entry } from "@/lib/entries";
import { getStats, type XpByType } from "@/lib/stats";
import {
  acceptRequest,
  getProfileByUsername,
  listConnections,
  removeConnection,
  sendRequest,
  type Relation,
} from "@/lib/friends";

type Loaded =
  | { profile: Profile; entries: Entry[]; byType: XpByType }
  | "missing"
  | { error: string }
  | null;

// Anyone's public profile: rank, category ranks and their Dex.
export default function UserProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Loaded>(null);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfileByUsername(decodeURIComponent(username));
        if (!profile) return !cancelled && setData("missing");
        const [entries, stats] = await Promise.all([
          listEntries(profile.id),
          getStats(profile.id),
        ]);
        if (!cancelled) setData({ profile, entries, byType: stats.byType });
      } catch (err) {
        if (!cancelled) setData({ error: describeError(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const profileId = data && typeof data === "object" && "profile" in data ? data.profile.id : null;

  const loadRelation = useCallback(async () => {
    if (!user || !profileId || user.id === profileId) return;
    const connections = await listConnections(user.id);
    setRelation(connections.find((c) => c.profile.id === profileId)?.relation ?? null);
  }, [user, profileId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from Supabase
    loadRelation().catch(() => {});
  }, [loadRelation]);

  async function act(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await loadRelation();
    } catch {
      alert("Something went wrong. Try again in a moment.");
    }
    setBusy(false);
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `@${username} on Trackd`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  if (data === null || authLoading) {
    return <p className="py-24 text-center text-white/50">Loading profile…</p>;
  }
  if (data === "missing") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-black">No one called @{decodeURIComponent(username)}</h1>
        <Link href="/friends" className="text-amber-400 hover:underline">
          Find people
        </Link>
      </div>
    );
  }
  if ("error" in data) {
    return <LoadError what="this profile" detail={data.error} />;
  }

  const { profile, entries, byType } = data;
  const isMe = user?.id === profile.id;
  const pill =
    "rounded-full px-5 py-2 text-sm font-bold transition disabled:opacity-50";

  const actions = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {isMe ? (
        <Link href="/profile" className={`${pill} border border-white/15 text-white/70 hover:bg-white/10`}>
          Account settings
        </Link>
      ) : !user ? (
        <Link href="/login" className={`${pill} bg-amber-400 text-black hover:bg-amber-300`}>
          Log in to add friend
        </Link>
      ) : relation === "friends" ? (
        <span className={`${pill} border border-emerald-400/40 text-emerald-400`}>Friends ✓</span>
      ) : relation === "sent" ? (
        <button
          disabled={busy}
          onClick={() => act(() => removeConnection(profile.id, user.id))}
          className={`${pill} border border-white/15 text-white/70 hover:bg-white/10`}
        >
          Requested · Cancel
        </button>
      ) : relation === "received" ? (
        <button
          disabled={busy}
          onClick={() => act(() => acceptRequest(profile.id, user.id))}
          className={`${pill} bg-amber-400 text-black hover:bg-amber-300`}
        >
          Accept friend request
        </button>
      ) : (
        <button
          disabled={busy}
          onClick={() => act(() => sendRequest(profile.id))}
          className={`${pill} bg-amber-400 text-black hover:bg-amber-300`}
        >
          Add friend
        </button>
      )}
      <button
        onClick={share}
        className={`${pill} border border-white/15 text-white/70 hover:bg-white/10`}
      >
        {copied ? "Link copied!" : "Share"}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 py-8">
      <RankOverview
        byType={byType}
        title="Rank"
        header={
          <>
            <Avatar username={profile.username} size="lg" />
            <h1 className="text-3xl font-black">@{profile.username}</h1>
            {actions}
          </>
        }
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-black">{isMe ? "Your Dex" : `@${profile.username}'s Dex`}</h2>
        <DexBrowser
          entries={entries}
          empty={<p className="py-16 text-center text-white/50">Nothing logged yet.</p>}
        />
      </section>
    </div>
  );
}
