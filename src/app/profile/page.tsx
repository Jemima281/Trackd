"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import { showInstallPrompt } from "@/components/InstallPrompt";
import { describeError } from "@/components/LoadError";
import MediaCard from "@/components/MediaCard";
import ProfileHeader from "@/components/ProfileHeader";
import RankBadge from "@/components/RankBadge";
import { entryToMedia, listEntries, type Entry } from "@/lib/entries";
import {
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  BANNERS,
  MAX_FAVORITES,
  updateProfile,
  type ProfileEdits,
} from "@/lib/profile";
import { rankFor, TIER_STYLES } from "@/lib/ranks";
import { getStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/client";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-bold">{title}</h2>
        {hint && <p className="text-xs text-white/40">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// Your own profile: customise how it looks, plus account links.
export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [stats, setStats] = useState<{ xp: number; hours: number } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<ProfileEdits | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    getStats(user.id).then(setStats).catch(() => {});
    listEntries(user.id).then(setEntries).catch(() => {});
  }, [user]);

  // Start editing from the saved profile once it has loaded.
  const edits: ProfileEdits | null =
    draft ??
    (profile && {
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_emoji: profile.avatar_emoji,
      avatar_color: profile.avatar_color,
      banner: profile.banner,
      favorites: profile.favorites,
    });

  if (loading) return <p className="py-24 text-center text-white/50">Loading…</p>;

  if (!user || !profile || !edits) {
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

  const set = (patch: Partial<ProfileEdits>) => {
    setDraft({ ...edits, ...patch });
    setMessage(null);
  };
  const dirty = draft !== null;
  const byKey = new Map(entries.map((e) => [e.media_key, e]));
  const favorites = edits.favorites.map((k) => byKey.get(k)).filter((e): e is Entry => !!e);

  function toggleFavorite(key: string) {
    const has = edits!.favorites.includes(key);
    if (!has && edits!.favorites.length >= MAX_FAVORITES) return;
    set({ favorites: has ? edits!.favorites.filter((k) => k !== key) : [...edits!.favorites, key] });
  }

  async function save() {
    if (!user || !edits) return;
    setSaving(true);
    try {
      await updateProfile(user.id, edits);
      await refreshProfile();
      setDraft(null);
      setMessage({ kind: "ok", text: "Saved!" });
    } catch (err) {
      setMessage({ kind: "error", text: `Couldn't save: ${describeError(err)}` });
    }
    setSaving(false);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const rank = stats ? rankFor(stats.xp) : null;
  const q = pickQuery.trim().toLowerCase();
  const pickable = entries.filter((e) => !q || e.title.toLowerCase().includes(q)).slice(0, 60);
  const swatch = "h-9 w-9 rounded-full transition";

  return (
    <div className="flex flex-col gap-8 py-8">
      <ProfileHeader profile={{ ...profile, ...edits }}>
        {rank && stats && (
          <Link href="/ranks" className="flex items-center justify-center gap-3">
            <RankBadge rank={rank} size="sm" />
            <span className={`font-bold ${TIER_STYLES[rank.tier].text}`}>{rank.name}</span>
            <span className="text-sm text-white/50">
              {stats.xp.toLocaleString()} XP · {stats.hours.toLocaleString()} h
            </span>
          </Link>
        )}
      </ProfileHeader>

      {favorites.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {favorites.map((e) => (
            <MediaCard key={e.id} item={entryToMedia(e)} />
          ))}
        </div>
      )}

      <h2 className="-mb-4 text-2xl font-black">Customise</h2>

      <Section title="Display name" hint="Shown above your @username. Optional.">
        <input
          value={edits.display_name ?? ""}
          maxLength={40}
          onChange={(e) => set({ display_name: e.target.value })}
          placeholder={`@${profile.username}`}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
        />
      </Section>

      <Section title="Bio" hint={`${(edits.bio ?? "").length}/160`}>
        <textarea
          value={edits.bio ?? ""}
          maxLength={160}
          rows={3}
          onChange={(e) => set({ bio: e.target.value })}
          placeholder="Favourite genres, hot takes, what you're watching…"
          className="resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
        />
      </Section>

      <Section title="Avatar">
        <div className="grid grid-cols-8 gap-2">
          <button
            onClick={() => set({ avatar_emoji: null })}
            className={`flex aspect-square items-center justify-center rounded-xl border text-sm font-black ${
              !edits.avatar_emoji ? "border-amber-400 bg-amber-400/10" : "border-white/10"
            }`}
            title="Use my initial"
          >
            {profile.username[0].toUpperCase()}
          </button>
          {AVATAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => set({ avatar_emoji: emoji })}
              className={`flex aspect-square items-center justify-center rounded-xl border text-xl ${
                edits.avatar_emoji === emoji ? "border-amber-400 bg-amber-400/10" : "border-white/10"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AVATAR_COLORS).map(([key, bg]) => (
            <button
              key={key}
              aria-label={key}
              onClick={() => set({ avatar_color: key })}
              className={`${swatch} ${bg} ${
                edits.avatar_color === key ? "ring-2 ring-white ring-offset-2 ring-offset-[#0b0b10]" : ""
              }`}
            />
          ))}
        </div>
      </Section>

      <Section title="Banner">
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(BANNERS).map(([key, b]) => (
            <button
              key={key}
              onClick={() => set({ banner: key })}
              className={`flex h-14 items-end rounded-xl p-1.5 text-[11px] font-bold text-white drop-shadow ${b.className} ${
                (edits.banner ?? "midnight") === key ? "ring-2 ring-white ring-offset-2 ring-offset-[#0b0b10]" : ""
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Top 4 favourites" hint="Pinned on your profile. Pick from your Dex.">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_FAVORITES }, (_, i) => favorites[i]).map((e, i) =>
            e ? (
              <div key={e.id} className="relative">
                <MediaCard item={entryToMedia(e)} />
                <button
                  onClick={() => toggleFavorite(e.media_key)}
                  aria-label={`Remove ${e.title}`}
                  className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/80 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                key={i}
                onClick={() => setPicking(true)}
                className="flex aspect-[2/3] items-center justify-center rounded-xl border border-dashed border-white/20 text-2xl text-white/30 hover:border-amber-400/60"
              >
                +
              </button>
            ),
          )}
        </div>
        {picking && (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex gap-2">
              <input
                type="search"
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder="Search your Dex…"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <button onClick={() => setPicking(false)} className="px-2 text-sm text-white/60">
                Done
              </button>
            </div>
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/50">
                Log some things first, then pick your favourites.
              </p>
            ) : (
              <div className="grid max-h-96 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                {pickable.map((e) => {
                  const chosen = edits.favorites.includes(e.media_key);
                  const full = !chosen && edits.favorites.length >= MAX_FAVORITES;
                  return (
                    <div
                      key={e.id}
                      className={`relative ${full ? "opacity-30" : ""} ${chosen ? "rounded-xl ring-2 ring-amber-400" : ""}`}
                    >
                      <MediaCard item={entryToMedia(e)} onClick={() => toggleFavorite(e.media_key)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Section>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex flex-col gap-2 sm:bottom-4">
        {message && (
          <p
            className={`rounded-xl px-4 py-2 text-center text-sm ${
              message.kind === "ok" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black shadow-lg shadow-black/50 transition hover:bg-amber-300 disabled:opacity-40"
        >
          {saving ? "Saving…" : dirty ? "Save profile" : "No changes"}
        </button>
      </div>

      <section className="flex flex-col items-center gap-3 border-t border-white/10 pt-8">
        <Link
          href={`/u/${profile.username}`}
          className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 font-semibold hover:bg-white/10"
        >
          <Avatar
            username={profile.username}
            emoji={profile.avatar_emoji}
            color={profile.avatar_color}
          />
          View my public profile
        </Link>
        <button
          onClick={showInstallPrompt}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
        >
          📲 Install the app
        </button>
        <Link href="/import" className="text-sm text-amber-400 hover:underline">
          Import from other apps
        </Link>
        <button
          onClick={signOut}
          className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
        >
          Log out
        </button>
      </section>
    </div>
  );
}
