"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { describeError } from "@/components/LoadError";
import { createGroup, GROUP_EMOJIS, listMyGroups, type GroupWithCount } from "@/lib/groups";

// "Your groups" on the Friends page: a row of group cards plus "New group".
export default function GroupsStrip() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(GROUP_EMOJIS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((err) => setError(describeError(err)));
  }, []);

  async function create() {
    setBusy(true);
    try {
      const id = await createGroup(name.trim(), emoji);
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Groups</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold hover:bg-white/10"
        >
          + New group
        </button>
      </div>

      {error && <p className="break-words font-mono text-xs text-red-300/80">{error}</p>}

      {groups && groups.length === 0 && !creating && (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-center text-sm text-white/50">
          Make a group for your anime club, film crew or book club, with its own leaderboard.
        </p>
      )}

      {groups && groups.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="flex w-36 shrink-0 flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/25"
            >
              <span className="text-2xl">{g.emoji ?? "👥"}</span>
              <span className="truncate font-bold">{g.name}</span>
              <span className="text-xs text-white/40">
                {g.members} member{g.members === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-white/[0.03] p-4">
          <input
            autoFocus
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name, e.g. Anime Club"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
          />
          <div className="flex flex-wrap gap-1.5">
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
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={!name.trim() || busy}
              className="flex-1 rounded-full bg-amber-400 py-2.5 font-bold text-black hover:bg-amber-300 disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create group"}
            </button>
            <button onClick={() => setCreating(false)} className="px-4 text-sm text-white/60">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
