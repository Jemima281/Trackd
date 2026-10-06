"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";

const links = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/search", label: "Search", icon: "⌕" },
  { href: "/dex", label: "Dex", icon: "◫" },
  { href: "/ranks", label: "Ranks", icon: "▲" },
  { href: "/friends", label: "Friends", icon: "☺" },
];

export default function Nav() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-black tracking-tight">
            track<span className="text-amber-400">d</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  pathname === l.href
                    ? "bg-amber-400 text-black"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex w-24 justify-end">
            {loading ? null : user ? (
              <Link href="/profile" aria-label="Your profile">
                <Avatar username={profile?.username ?? user.email ?? "?"} />
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium hover:bg-white/10"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Bottom tab bar (phones) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-white/10 bg-background/90 backdrop-blur sm:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
              pathname === l.href ? "text-amber-400" : "text-white/60"
            }`}
          >
            <span className="text-lg leading-none">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
