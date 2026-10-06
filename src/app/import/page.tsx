"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { describeError } from "@/components/LoadError";
import { importAniListUser, importMalFile } from "@/lib/import/anilist";
import { saveImport } from "@/lib/import/save";
import { importImdb, importLetterboxd } from "@/lib/import/tmdb";
import type { ImportResult } from "@/lib/import/types";
import { STATUSES, statusLabel } from "@/lib/entries";
import { xpFor } from "@/lib/xp";

type Source = "anilist" | "mal" | "letterboxd" | "imdb";

const SOURCES: {
  id: Source;
  name: string;
  covers: string;
  input: "username" | "file";
  accept?: string;
  steps: React.ReactNode;
}[] = [
  {
    id: "anilist",
    name: "AniList",
    covers: "Anime + manga",
    input: "username",
    steps: <>Just enter your AniList username. Your list needs to be public.</>,
  },
  {
    id: "mal",
    name: "MyAnimeList",
    covers: "Anime + manga",
    input: "file",
    accept: ".xml,.gz",
    steps: (
      <>
        On MyAnimeList go to <b>Profile → Export</b> (myanimelist.net/panel.php?go=export), export
        your anime list, and upload the file here. Do it again for manga.
      </>
    ),
  },
  {
    id: "letterboxd",
    name: "Letterboxd",
    covers: "Movies",
    input: "file",
    accept: ".zip,.csv",
    steps: (
      <>
        On Letterboxd go to <b>Settings → Data → Export your data</b>, then upload the .zip you
        get here.
      </>
    ),
  },
  {
    id: "imdb",
    name: "IMDb",
    covers: "Movies + TV",
    input: "file",
    accept: ".csv",
    steps: (
      <>
        On IMDb open <b>Your Ratings</b> (and/or your <b>Watchlist</b>), tap <b>⋯ → Export</b>, and
        upload the CSV files here. IMDb emails them to you or puts them under Exports.
      </>
    ),
  },
];

type Stage =
  | { kind: "pick" }
  | { kind: "reading"; done: number; total: number }
  | { kind: "review"; result: ImportResult }
  | { kind: "saving"; done: number; total: number }
  | { kind: "done"; added: number; skipped: number };

export default function ImportPage() {
  const { user, loading } = useAuth();
  const [source, setSource] = useState<Source>("anilist");
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const [error, setError] = useState<string | null>(null);

  const info = SOURCES.find((s) => s.id === source)!;

  if (loading) return <p className="py-24 text-center text-white/50">Loading…</p>;
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-black">Log in to import</h1>
        <Link href="/login" className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black">
          Log in
        </Link>
      </div>
    );
  }

  async function read() {
    setError(null);
    const onProgress = (done: number, total: number) => setStage({ kind: "reading", done, total });
    setStage({ kind: "reading", done: 0, total: 1 });
    try {
      const result =
        source === "anilist"
          ? await importAniListUser(username, onProgress)
          : source === "mal"
            ? await importMalFile(files[0], onProgress)
            : source === "letterboxd"
              ? await importLetterboxd(files, onProgress)
              : await importImdb(files, onProgress);
      setStage({ kind: "review", result });
    } catch (err) {
      setError(err instanceof Error ? err.message : describeError(err));
      setStage({ kind: "pick" });
    }
  }

  async function save(result: ImportResult) {
    if (!user) return;
    setError(null);
    try {
      const added = await saveImport(user.id, result.items, (done, total) =>
        setStage({ kind: "saving", done, total }),
      );
      setStage({ kind: "done", added, skipped: result.items.length - added });
    } catch (err) {
      setError(describeError(err));
      setStage({ kind: "review", result });
    }
  }

  const ready = info.input === "username" ? username.trim().length > 1 : files.length > 0;

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-4xl font-black">Import</h1>
        <p className="mt-1 text-white/60">
          Bring your history over from other apps. Anything already in your Dex is left as it is.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {stage.kind === "pick" && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSource(s.id);
                  setFiles([]);
                  setError(null);
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  source === s.id
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/30"
                }`}
              >
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-white/50">{s.covers}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-white/70">{info.steps}</p>
            {info.input === "username" ? (
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="AniList username"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
              />
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-white/60 hover:border-amber-400/60">
                <span className="text-2xl">📄</span>
                {files.length
                  ? files.map((f) => f.name).join(", ")
                  : `Choose ${info.accept?.replaceAll(",", " / ")} file${source === "mal" ? "" : "s"}`}
                <input
                  type="file"
                  accept={info.accept}
                  multiple={source !== "mal"}
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
              </label>
            )}
            <button
              onClick={read}
              disabled={!ready}
              className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-40"
            >
              Find my stuff
            </button>
          </div>
        </>
      )}

      {(stage.kind === "reading" || stage.kind === "saving") && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-bold">
            {stage.kind === "reading" ? `Matching your ${info.name} list…` : "Adding to your Dex…"}
          </p>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${Math.max(4, (stage.done / Math.max(stage.total, 1)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/40">Big lists can take a minute — keep this page open.</p>
        </div>
      )}

      {stage.kind === "review" && <Review result={stage.result} onBack={() => setStage({ kind: "pick" })} onSave={save} />}

      {stage.kind === "done" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-5xl">🎉</p>
          <h2 className="text-2xl font-black">Added {stage.added.toLocaleString()} to your Dex</h2>
          {stage.skipped > 0 && (
            <p className="text-sm text-white/50">
              {stage.skipped.toLocaleString()} {stage.skipped === 1 ? "was" : "were"} already in your
              Dex, so we left {stage.skipped === 1 ? "it" : "them"} alone.
            </p>
          )}
          <div className="flex gap-2">
            <Link href="/ranks" className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300">
              See my rank
            </Link>
            <button
              onClick={() => {
                setFiles([]);
                setStage({ kind: "pick" });
              }}
              className="rounded-full border border-white/15 px-6 py-3 text-white/70 hover:bg-white/10"
            >
              Import more
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Review({
  result,
  onBack,
  onSave,
}: {
  result: ImportResult;
  onBack: () => void;
  onSave: (result: ImportResult) => void;
}) {
  const { items, unmatched } = result;
  const xp = items.reduce((sum, i) => sum + xpFor(i.status, i.progress, i.media.unitMinutes ?? null), 0);
  const types = [...new Set(items.map((i) => i.media.type))];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <p className="text-4xl font-black">{items.length.toLocaleString()}</p>
        <p className="text-white/60">items found · worth up to {xp.toLocaleString()} XP</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-xl border border-white/10 px-3 py-2 text-center">
            <p className="text-xl font-black">{items.filter((i) => i.status === s).length}</p>
            <p className="text-xs text-white/50">
              {types.length === 1 ? statusLabel(s, types[0]) : s === "in_progress" ? "In progress" : statusLabel(s, "anime")}
            </p>
          </div>
        ))}
      </div>

      {unmatched.length > 0 && (
        <details className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60">
          <summary className="cursor-pointer">
            {unmatched.length} couldn&apos;t be matched — you can add these by hand later
          </summary>
          <ul className="mt-2 max-h-48 list-disc overflow-y-auto pl-5 text-xs">
            {unmatched.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onSave(result)}
          disabled={items.length === 0}
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300 disabled:opacity-40"
        >
          Import {items.length.toLocaleString()} items
        </button>
        <button onClick={onBack} className="py-2 text-sm text-white/60 hover:text-white">
          Back
        </button>
      </div>
    </div>
  );
}
