"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import { describeError } from "@/components/LoadError";
import { STATUS_STYLES, statusLabel } from "@/lib/entries";
import { describeAction, getFeed, timeAgo, type FeedItem } from "@/lib/feed";

function FeedRow({ item }: { item: FeedItem }) {
  const showProgress = item.status === "in_progress" && item.total_units && item.media_type !== "movie";
  return (
    <div className="flex gap-3 border-b border-white/5 py-4 last:border-0">
      <Link href={`/u/${item.username}`} className="shrink-0">
        <Avatar username={item.username} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-white/80">
          <Link href={`/u/${item.username}`} className="font-bold text-white hover:underline">
            @{item.username}
          </Link>{" "}
          {describeAction(item)} <span className="font-bold text-white">{item.title}</span>
          {item.rating && (
            <span className="ml-1 whitespace-nowrap font-bold text-amber-400">★ {item.rating}</span>
          )}
        </p>
        <p className="mt-1 flex items-center gap-2 text-xs text-white/40">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[item.status].badge}`}
          >
            {statusLabel(item.status, item.media_type)}
          </span>
          {showProgress && (
            <span>
              {item.progress}/{item.total_units}
            </span>
          )}
          <span>{timeAgo(item.created_at)}</span>
        </p>
      </div>
      {item.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.cover}
          alt=""
          loading="lazy"
          className={`w-12 shrink-0 rounded-md object-cover ${
            item.media_type === "album" ? "aspect-square self-start" : "aspect-[2/3]"
          }`}
        />
      )}
    </div>
  );
}

// Logged-in home: what you and your friends have been up to.
export default function HomeFeed() {
  const { profile } = useAuth();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    getFeed()
      .then((rows) => {
        setItems(rows);
        setMore(rows.length === 30);
      })
      .catch((err) => setError(describeError(err)));
  }, []);

  async function loadMore() {
    if (!items?.length) return;
    setLoadingMore(true);
    try {
      const rows = await getFeed(items[items.length - 1].created_at);
      setItems([...items, ...rows]);
      setMore(rows.length === 30);
    } catch (err) {
      setError(describeError(err));
    }
    setLoadingMore(false);
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl font-black">
          Hey{profile ? `, @${profile.username}` : ""} 👋
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { href: "/search", label: "Log something", icon: "＋" },
          { href: "/ranks", label: "My ranks", icon: "▲" },
          { href: "/friends", label: "Leaderboard", icon: "🏆" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-sm font-semibold transition hover:border-amber-400/50"
          >
            <span className="text-xl">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>

      <section className="flex flex-col">
        <h2 className="text-xl font-black">Activity</h2>
        {error ? (
          <p className="break-words py-8 text-center font-mono text-xs text-red-300/80">
            Couldn&apos;t load activity: {error}
          </p>
        ) : !items ? (
          <p className="py-12 text-center text-white/50">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-white/50">
            Nothing yet. Log something, or{" "}
            <Link href="/friends" className="text-amber-400 hover:underline">
              add friends
            </Link>{" "}
            to see what they&apos;re into.
          </p>
        ) : (
          <>
            {items.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
            {more && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-4 self-center rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
