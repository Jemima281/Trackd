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
import RatingPicker from "@/components/RatingPicker";
import { CATEGORY } from "@/lib/categories";
import type { MediaResult } from "@/lib/search";
import { MAX_UNKNOWN_UNITS, UNIT_NAMES, xpFor } from "@/lib/xp";

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
  const [progress, setProgress] = useState<number>(entry?.progress ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMovie = media.type === "movie";

  // Movies and TV don't include their length in search results, and ongoing
  // series have no official total, so look those up when the sheet opens.
  const [length, setLength] = useState<
    Pick<MediaResult, "totalUnits" | "unitMinutes"> & { maxUnits?: number; ongoing?: boolean }
  >({ totalUnits: media.totalUnits, unitMinutes: media.unitMinutes });
  // Manga keep getting new chapters, so a saved chapter count can be out of
  // date: check again every time (the server caches it for a day).
  const [checkedComic, setCheckedComic] = useState(false);
  const isComic = media.key.startsWith("anilist:") && (media.type === "manga" || media.type === "manhwa");
  const needsLength =
    length.unitMinutes === undefined ||
    (isComic && !checkedComic) ||
    (!isMovie && length.totalUnits == null && length.maxUnits === undefined);
  useEffect(() => {
    if (!needsLength) return;
    let cancelled = false;
    fetch(`/api/details?key=${encodeURIComponent(media.key)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((found) => {
        if (cancelled) return;
        setCheckedComic(true);
        setLength(found);
      })
      .catch(
        () =>
          !cancelled &&
          (setCheckedComic(true),
          setLength((prev) => ({
            totalUnits: prev.totalUnits ?? null,
            unitMinutes: prev.unitMinutes ?? null,
            maxUnits: prev.maxUnits ?? MAX_UNKNOWN_UNITS,
          }))),
      );
    return () => {
      cancelled = true;
    };
  }, [needsLength, media.key]);

  const total = length.totalUnits ?? null;
  // Highest progress allowed: the real total, or a safe cap for ongoing series.
  // An ongoing series' count is "so far", so allow going a little past it.
  const limit = length.ongoing
    ? Math.max(total ?? 0, length.maxUnits ?? MAX_UNKNOWN_UNITS)
    : (total ?? length.maxUnits ?? MAX_UNKNOWN_UNITS);
  // Completed with a known total means all of it, even if the total arrived
  // after "Completed" was tapped.
  const allDone = status === "completed" && !!total;
  const shownProgress = allDone ? total : Math.min(progress, limit);
  const xp = status ? xpFor(status, shownProgress, length.unitMinutes ?? null) : 0;

  function pickStatus(s: Status) {
    setStatus(s);
    // Finishing something means you got through all of it.
    if (s === "completed" && total) setProgress(total);
    else if (isMovie) setProgress(s === "completed" ? 1 : 0);
  }

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
      onSaved(
        await saveEntry(
          user.id,
          { ...media, totalUnits: total, unitMinutes: length.unitMinutes ?? null },
          status,
          rating,
          shownProgress,
          entry,
        ),
      );
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
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#15151c] p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          {media.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.cover}
              alt=""
              className="aspect-[2/3] w-20 shrink-0 rounded-lg object-cover"
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
                  onClick={() => pickStatus(s)}
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

            {!isMovie && (
              <label className="flex items-center justify-between gap-3 text-sm font-medium text-white/70">
                <span className="first-letter:uppercase">{UNIT_NAMES[media.type]} done</span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={limit}
                    value={shownProgress}
                    readOnly={allDone}
                    onChange={(e) => {
                      const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                      setProgress(Math.min(n, limit));
                    }}
                    className="w-20 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-right text-base text-white outline-none focus:border-amber-400"
                  />
                  <span className="w-14 text-white/40">
                    {needsLength ? "of …" : total ? `of ${total}` : "of ?"}
                  </span>
                </span>
              </label>
            )}
            {!isMovie && !needsLength && !total && (
              <p className="-mt-3 text-xs text-white/40">
                Still running, so there&apos;s no official count. Enter how many{" "}
                {UNIT_NAMES[media.type]} you&apos;ve {CATEGORY[media.type].did}{" "}
                (up to {limit.toLocaleString()}).
              </p>
            )}

            <RatingPicker value={rating} onChange={setRating} />

            {error && <p className="text-sm text-red-300">{error}</p>}

            <div className="flex flex-col gap-2">
              {status && (
                <p className="text-center text-sm text-white/60">
                  Worth{" "}
                  <span className="font-black text-amber-400">
                    {needsLength ? "…" : xp.toLocaleString()} XP
                  </span>
                </p>
              )}
              <button
                onClick={save}
                disabled={!status || busy || needsLength}
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
