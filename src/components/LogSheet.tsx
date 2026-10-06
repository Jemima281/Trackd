"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  deleteEntry,
  saveEntry,
  statusLabel,
  STATUS_STYLES,
  STATUSES,
  type Entry,
  type Status,
} from "@/lib/entries";
import type { MediaResult } from "@/lib/search";

// Pop-up for adding an item to your Dex or changing how it's logged.
export default function LogSheet({
  media,
  entry,
  onClose,
  onSaved,
  onDeleted,
}: {
  media: MediaResult;
  entry: Entry | null;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
  onDeleted: (mediaKey: string) => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status | null>(entry?.status ?? null);
  const [rating, setRating] = useState<number | null>(entry?.rating ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!user || !status) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveEntry(user.id, media, status, rating, entry));
      onClose();
    } catch {
      setError("Couldn't save. Try again in a moment.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      await deleteEntry(entry.id);
      onDeleted(media.key);
      onClose();
    } catch {
      setError("Couldn't remove it. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`Log ${media.title}`}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#15151c] p-6 pb-10 sm:rounded-3xl sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          {media.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.cover}
              alt=""
              className={`w-20 shrink-0 rounded-lg object-cover ${
                media.type === "album" ? "aspect-square" : "aspect-[2/3]"
              }`}
            />
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-black leading-tight">{media.title}</h2>
            {media.subtitle && <p className="text-sm text-white/60">{media.subtitle}</p>}
            <p className="text-sm text-white/40">
              {[media.year, media.details].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {!user ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-white/70">Log in to add this to your Dex.</p>
            <Link
              href="/login"
              className="rounded-full bg-amber-400 px-6 py-2.5 font-bold text-black hover:bg-amber-300"
            >
              Log in
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    status === s
                      ? STATUS_STYLES[s].button
                      : "border-white/10 text-white/70 hover:bg-white/5"
                  }`}
                >
                  {statusLabel(s, media.type)}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-white/70">
                Your rating{" "}
                <span className="text-white/40">(optional — tap again to clear)</span>
              </p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? null : n)}
                    className={`rounded-lg py-2 text-sm font-bold transition ${
                      rating !== null && n <= rating
                        ? "bg-amber-400 text-black"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <div className="flex flex-col gap-2">
              <button
                onClick={save}
                disabled={!status || busy}
                className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-40"
              >
                {busy ? "Saving…" : entry ? "Save changes" : "Add to Dex"}
              </button>
              {entry && (
                <button
                  onClick={remove}
                  disabled={busy}
                  className="py-2 text-sm text-red-300/80 hover:text-red-300"
                >
                  Remove from Dex
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
