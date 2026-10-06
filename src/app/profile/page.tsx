"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <p className="py-24 text-center text-white/50">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-black">You&apos;re not logged in</h1>
        <Link
          href="/login"
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
        >
          Log in
        </Link>
      </div>
    );
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const joined = profile
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Avatar username={profile?.username ?? user.email ?? "?"} size="lg" />
      <h1 className="text-3xl font-black">@{profile?.username ?? "unknown"}</h1>
      {joined && <p className="text-white/50">Collecting since {joined}</p>}
      <span className="rounded-full border border-amber-700/60 bg-amber-900/30 px-4 py-1 text-sm font-semibold text-amber-500">
        Unranked · 0 XP
      </span>
      <button
        onClick={signOut}
        className="mt-6 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
      >
        Log out
      </button>
    </div>
  );
}
