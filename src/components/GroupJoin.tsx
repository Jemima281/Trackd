"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { describeError } from "@/components/LoadError";
import { joinGroup, previewGroup } from "@/lib/groups";

type Preview = Awaited<ReturnType<typeof previewGroup>>;

// Opened from an invite link: show the group, then join it.
export default function GroupJoin({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [preview, setPreview] = useState<Preview | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    previewGroup(code)
      .then(setPreview)
      .catch((err) => setError(describeError(err)));
  }, [code]);

  async function join() {
    setBusy(true);
    try {
      const id = await joinGroup(code);
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  }

  if (preview === "loading" && !error) return <p className="py-24 text-center text-white/50">Loading invite…</p>;
  if (!preview || preview === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="text-2xl font-black">This invite link doesn&apos;t work</h1>
        <p className="text-white/50">{error ?? "The group may have been deleted."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-6xl">{preview.emoji ?? "👥"}</span>
      <p className="text-sm text-white/50">You&apos;re invited to join</p>
      <h1 className="text-3xl font-black">{preview.name}</h1>
      <p className="text-white/50">
        {preview.members} member{preview.members === 1 ? "" : "s"} · compete on the group leaderboard
      </p>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading ? null : user ? (
        <button
          onClick={join}
          disabled={busy}
          className="rounded-full bg-amber-400 px-8 py-3 font-bold text-black hover:bg-amber-300 disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join group"}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-white/60">Log in or sign up, then open this link again.</p>
          <div className="flex gap-2">
            <Link href="/signup" className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black">
              Sign up
            </Link>
            <Link href="/login" className="rounded-full border border-white/15 px-6 py-3 font-semibold">
              Log in
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
