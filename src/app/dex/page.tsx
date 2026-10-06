"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import DexBrowser from "@/components/DexBrowser";
import LogSheet from "@/components/LogSheet";
import { entryToMedia, listEntries, type Entry } from "@/lib/entries";
import { totals } from "@/lib/xp";

export default function DexPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    if (!user) return;
    listEntries(user.id)
      .then(setEntries)
      .catch(() => setFailed(true));
  }, [user]);

  if (loading || (user && !entries && !failed)) {
    return <p className="py-24 text-center text-white/50">Loading your Dex…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-4xl font-black">Your Dex</h1>
        <p className="max-w-md text-white/60">
          Log in to start collecting everything you watch, read and listen to.
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

  if (failed || !entries) {
    return (
      <p className="py-24 text-center text-red-300">
        Couldn&apos;t load your Dex. Try refreshing.
      </p>
    );
  }

  const completed = entries.filter((e) => e.status === "completed").length;
  const { xp } = totals(entries);

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl font-black">Your Dex</h1>
        <div className="flex gap-4 text-right text-sm text-white/50">
          <p>
            <span className="text-2xl font-black text-emerald-400">{completed}</span>{" "}
            done
          </p>
          <p>
            <span className="text-2xl font-black text-amber-400">{xp.toLocaleString()}</span>{" "}
            XP
          </p>
        </div>
      </div>

      <DexBrowser
        entries={entries}
        onSelect={setSelected}
        empty={
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-white/60">Your Dex is empty. Time to start collecting!</p>
            <Link
              href="/search"
              className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
            >
              Find something
            </Link>
          </div>
        }
      />

      {selected && (
        <LogSheet
          media={entryToMedia(selected)}
          entry={selected}
          onClose={() => setSelected(null)}
          onSaved={(saved) =>
            setEntries((prev) => [saved, ...(prev ?? []).filter((e) => e.id !== saved.id)])
          }
          onDeleted={(key) =>
            setEntries((prev) => (prev ?? []).filter((e) => e.media_key !== key))
          }
        />
      )}
    </div>
  );
}
