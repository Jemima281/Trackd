"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import { showInstallPrompt } from "@/components/InstallPrompt";
import { describeError } from "@/components/LoadError";
import MediaCard from "@/components/MediaCard";
import Pager, { paginate } from "@/components/Pager";
import ProfileHeader from "@/components/ProfileHeader";
import RankBadge from "@/components/RankBadge";
import { entryToMedia, listEntries, type Entry } from "@/lib/entries";
import { deletePhoto, squarePhoto, uploadPhoto } from "@/lib/photo";
import { BANNERS, MAX_FAVORITES, updateProfile, type ProfileEdits } from "@/lib/profile";
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

const PICKER_PAGE = 12;

// Your own profile: customise how it looks, plus account links.
export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [stats, setStats] = useState<{ xp: number; hours: number } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<ProfileEdits | null>(null);
  // A new photo waiting to be uploaded on save, with a local preview.
  const [newPhoto, setNewPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [pickPage, setPickPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    getStats(user.id).then(setStats).catch(() => {});
    listEntries(user.id).then(setEntries).catch(() => {});
  }, [user]);

  // Free the preview image when it's replaced or the page closes.
  useEffect(() => {
    return () => {
      if (newPhoto) URL.revokeObjectURL(newPhoto.preview);
    };
  }, [newPhoto]);

  const pickable = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    return entries.filter((e) => !q || e.title.toLowerCase().includes(q));
  }, [entries, pickQuery]);

  // Start editing from the saved profile once it has loaded.
  const edits: ProfileEdits | null =
    draft ??
    (profile && {
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
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
  const dirty = draft !== null || newPhoto !== null;
  const byKey = new Map(entries.map((e) => [e.media_key, e]));
  const favorites = edits.favorites.map((k) => byKey.get(k)).filter((e): e is Entry => !!e);
  const shownPhoto = newPhoto?.preview ?? edits.avatar_url;

  function toggleFavorite(key: string) {
    const has = edits!.favorites.includes(key);
    if (!has && edits!.favorites.length >= MAX_FAVORITES) return;
    set({ favorites: has ? edits!.favorites.filter((k) => k !== key) : [...edits!.favorites, key] });
  }

  async function pickPhoto(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    try {
      const blob = await squarePhoto(file);
      setNewPhoto({ blob, preview: URL.createObjectURL(blob) });
      setMessage(null);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : String(err));
    }
  }

  function removePhoto() {
    setNewPhoto(null);
    set({ avatar_url: null });
  }

  function discard() {
    setDraft(null);
    setNewPhoto(null);
    setPhotoError(null);
    setMessage(null);
  }

  async function save() {
    if (!user || !profile || !edits) return;
    setSaving(true);
    try {
      const avatar_url = newPhoto ? await uploadPhoto(user.id, newPhoto.blob) : edits.avatar_url;
      await updateProfile(user.id, { ...edits, avatar_url });
      if (profile.avatar_url && profile.avatar_url !== avatar_url) await deletePhoto(profile.avatar_url);
      await refreshProfile();
      setDraft(null);
      setNewPhoto(null);
      setMessage({ kind: "ok", text: "Profile saved" });
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
  const { pageItems, pageCount, current } = paginate(pickable, pickPage, PICKER_PAGE);

  return (
    // Extra space at the bottom while the save bar is showing, so it never covers anything.
    <div className={`flex flex-col gap-8 py-8 ${dirty ? "pb-28" : ""}`}>
      <ProfileHeader profile={{ ...profile, ...edits, avatar_url: shownPhoto }}>
        {rank && stats && (
          <Link href="/ranks" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <RankBadge rank={rank} size="sm" />
            <span className={`font-bold ${TIER_STYLES[rank.tier].text}`}>{rank.name}</span>
            <span className="text-sm text-white/50">
              {stats.xp.toLocaleString()} XP · {stats.hours.toLocaleString()} h
            </span>
          </Link>
        )}
      </ProfileHeader>

      {message && (
        <p
          className={`-mt-4 rounded-xl px-4 py-2 text-center text-sm ${
            message.kind === "ok" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <h2 className="-mb-4 text-2xl font-black">Edit profile</h2>

      <Section title="Profile picture" hint="Square photos look best. JPG, PNG or HEIC.">
        <div className="flex items-center gap-4">
          <Avatar username={profile.username} url={shownPhoto} size="lg" />
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer rounded-full bg-amber-400 px-5 py-2.5 text-center text-sm font-bold text-black hover:bg-amber-300">
              {shownPhoto ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {shownPhoto && (
              <button onClick={removePhoto} className="text-sm text-white/50 hover:text-red-300">
                Remove photo
              </button>
            )}
          </div>
        </div>
        {photoError && <p className="text-sm text-red-300">{photoError}</p>}
      </Section>

      <Section title="Display name" hint="Shown above your @username. Optional.">
        <input
          value={edits.display_name ?? ""}
          maxLength={40}
          onChange={(e) => set({ display_name: e.target.value })}
          placeholder={`@${profile.username}`}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base outline-none focus:border-amber-400"
        />
      </Section>

      <Section title="Bio" hint={`${(edits.bio ?? "").length}/160`}>
        <textarea
          value={edits.bio ?? ""}
          maxLength={160}
          rows={3}
          onChange={(e) => set({ bio: e.target.value })}
          placeholder="Favourite genres, hot takes, what you're watching…"
          className="resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base outline-none focus:border-amber-400"
        />
      </Section>

      <Section title="Banner">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(BANNERS).map(([key, b]) => (
            <button
              key={key}
              onClick={() => set({ banner: key })}
              className={`flex h-14 items-end rounded-xl p-2 text-xs font-bold text-white drop-shadow ${b.className} ${
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
              <div key={e.id} className="relative min-w-0">
                <MediaCard item={entryToMedia(e)} />
                <button
                  onClick={() => toggleFavorite(e.media_key)}
                  aria-label={`Remove ${e.title}`}
                  className="absolute right-1 top-1 h-7 w-7 rounded-full bg-black/80 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                key={i}
                onClick={() => setPicking(true)}
                aria-label="Add a favourite"
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
                onChange={(e) => {
                  setPickQuery(e.target.value);
                  setPickPage(1);
                }}
                placeholder="Search your Dex…"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-base outline-none focus:border-amber-400"
              />
              <button
                onClick={() => setPicking(false)}
                className="rounded-full bg-white/10 px-4 text-sm font-semibold"
              >
                Done
              </button>
            </div>
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/50">
                Log some things first, then pick your favourites.
              </p>
            ) : (
              <>
                <p className="text-xs text-white/40">
                  {edits.favorites.length}/{MAX_FAVORITES} picked · tap to add or remove
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {pageItems.map((e) => {
                    const chosen = edits.favorites.includes(e.media_key);
                    const full = !chosen && edits.favorites.length >= MAX_FAVORITES;
                    return (
                      <div
                        key={e.id}
                        className={`relative min-w-0 rounded-xl ${full ? "opacity-30" : ""} ${chosen ? "ring-2 ring-amber-400" : ""}`}
                      >
                        <MediaCard item={entryToMedia(e)} onClick={() => toggleFavorite(e.media_key)} />
                        {chosen && (
                          <span className="absolute left-1 top-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">
                            ★ Picked
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Pager page={current} pageCount={pageCount} onChange={setPickPage} />
              </>
            )}
          </div>
        )}
      </Section>

      <section className="flex flex-col gap-2 border-t border-white/10 pt-8">
        <Link
          href={`/u/${profile.username}`}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 font-semibold hover:bg-white/[0.06]"
        >
          <Avatar username={profile.username} url={profile.avatar_url} />
          <span className="flex-1">View my public profile</span>
          <span className="text-white/30">›</span>
        </Link>
        {[
          { href: `/u/${profile.username}/stats/all`, label: "📊 My stats" },
          { href: "/import", label: "📥 Import from other apps" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 font-semibold hover:bg-white/[0.06]"
          >
            <span className="flex-1">{l.label}</span>
            <span className="text-white/30">›</span>
          </Link>
        ))}
        <button
          onClick={showInstallPrompt}
          className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left font-semibold hover:bg-white/[0.06]"
        >
          <span className="flex-1">📲 Install the app</span>
          <span className="text-white/30">›</span>
        </button>
        <button onClick={signOut} className="mt-4 self-center py-2 text-sm text-white/50 hover:text-red-300">
          Log out
        </button>
        <nav className="flex justify-center gap-5 text-xs text-white/35">
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </nav>
      </section>

      {/* Save bar: only while there are unsaved changes, above the tab bar. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-white/10 bg-[#0b0b10]/95 px-4 py-3 backdrop-blur sm:bottom-0">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <span className="flex-1 text-sm text-white/60">Unsaved changes</span>
            <button
              onClick={discard}
              disabled={saving}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10"
            >
              Discard
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
