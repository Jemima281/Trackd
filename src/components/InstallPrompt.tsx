"use client";

import { useEffect, useState } from "react";

// Shown on phones that haven't installed Shuin to the home screen yet,
// with the steps for their browser. Dismissing hides it for 30 days; the
// account page can bring it back with showInstallPrompt().

type Platform = "ios" | "android" | "in-app";

const DISMISS_KEY = "shuin-install-dismissed";
const SHOW_EVENT = "shuin:show-install";
const HIDE_DAYS = 30;

// Chrome's install prompt event (not in TypeScript's DOM types).
type InstallEvent = Event & { prompt: () => Promise<void> };

// Chrome can announce installability before React has rendered, so catch
// the event as soon as this module loads and hand it over later.
const INSTALLABLE_EVENT = "shuin:installable";
let deferredInstall: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of Chrome's mini-bar
    deferredInstall = e as InstallEvent;
    window.dispatchEvent(new Event(INSTALLABLE_EVENT));
  });
}

export function showInstallPrompt() {
  window.dispatchEvent(new Event(SHOW_EVENT));
}

function detect(): Platform | null {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return null; // already installed
  if (/Instagram|FBAN|FBAV|TikTok|musical_ly|Snapchat|Line\/|Twitter/i.test(ua)) return "in-app";
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return null; // desktop
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < HIDE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-4 w-4 -translate-y-px" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share">
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-4 w-4 -translate-y-px" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-label="Add">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 font-semibold text-white">
      {children}
    </span>
  );
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const p = detect();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection
    setPlatform(p);
    // Wait a moment so it doesn't pop up the instant the page opens.
    const timer = setTimeout(() => setOpen(!!p && !recentlyDismissed()), 2500);

    setInstallEvent(deferredInstall);
    const onInstallable = () => setInstallEvent(deferredInstall);
    const onInstalled = () => setOpen(false);
    const onShow = () => {
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
      setOpen(true);
    };
    window.addEventListener(INSTALLABLE_EVENT, onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(SHOW_EVENT, onShow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(INSTALLABLE_EVENT, onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(SHOW_EVENT, onShow);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    deferredInstall = null;
    setInstallEvent(null);
  }

  if (!open) return null;

  if (!platform) {
    // Opened from the account page on a computer or in the installed app.
    return (
      <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-2xl border border-white/15 bg-[#17171f] p-4 text-sm text-white/80 shadow-2xl shadow-black sm:bottom-6">
        <button onClick={() => setOpen(false)} aria-label="Close" className="absolute right-3 top-2 p-1 text-white/40">
          ✕
        </button>
        You&apos;re already using the app, or you&apos;re on a computer. Open{" "}
        <b className="text-white">shuin.io</b> on your phone to install it.
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Install Shuin"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-2xl border border-amber-400/30 bg-[#17171f] p-4 shadow-2xl shadow-black"
    >
      <button onClick={dismiss} aria-label="Not now" className="absolute right-3 top-2 p-1 text-lg text-white/40 hover:text-white">
        ✕
      </button>
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 pr-5">
          <p className="font-bold">Get the Shuin app</p>
          <p className="text-xs text-white/50">Full screen, on your home screen. Free, no app store.</p>
        </div>
      </div>

      <div className="mt-3 text-sm leading-relaxed text-white/75">
        {platform === "ios" && (
          <ol className="flex flex-col gap-1.5">
            <li>
              1. Tap <Key>⋯</Key> in Safari&apos;s bar (or <Key><ShareIcon /></Key> if you see it)
            </li>
            <li>
              2. Tap <Key><ShareIcon /> Share</Key>
            </li>
            <li>
              3. Scroll down and tap <Key><AddIcon /> Add to Home Screen</Key>
            </li>
          </ol>
        )}
        {platform === "android" &&
          (installEvent ? (
            <button
              onClick={install}
              className="w-full rounded-full bg-amber-400 py-2.5 font-bold text-black hover:bg-amber-300"
            >
              Install app
            </button>
          ) : (
            <ol className="flex flex-col gap-1.5">
              <li>
                1. Tap <Key>⋮</Key> at the top right of Chrome
              </li>
              <li>
                2. Tap <Key>Install app</Key> or <Key>Add to Home screen</Key>
              </li>
            </ol>
          ))}
        {platform === "in-app" && (
          <p>
            You&apos;re in another app&apos;s browser, which can&apos;t install apps. Tap <Key>⋯</Key> and
            choose <Key>Open in browser</Key> (Safari or Chrome), then come back to this banner.
          </p>
        )}
      </div>

      {platform === "ios" && (
        // Points down towards Safari's toolbar.
        <div className="pointer-events-none absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-amber-400/30 bg-[#17171f]" />
      )}
    </div>
  );
}
