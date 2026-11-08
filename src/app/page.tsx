import Link from "next/link";
import HomeSwitch from "@/components/HomeSwitch";
import { CATEGORIES } from "@/lib/categories";

export default function Home() {
  return <HomeSwitch landing={<Landing />} />;
}

function Landing() {
  return (
    <div className="flex flex-col gap-12 py-12">
      <section className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
          Collect everything
          <br />
          you <span className="text-amber-400">watch &amp; read</span>.
        </h1>
        <p className="max-w-lg text-lg text-white/60">
          Stamp your Dex, earn XP, rank up from Bronze to Legend, and see who
          among your friends is the real connoisseur.
        </p>
        <Link
          href="/signup"
          className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black transition hover:bg-amber-300"
        >
          Start collecting
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {CATEGORIES.map((c) => (
          <div
            key={c.type}
            className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-b ${c.gradient} to-transparent`}
          >
            <span className="text-4xl">{c.icon}</span>
            <span className="font-semibold">{c.label}</span>
          </div>
        ))}
      </section>

      <footer className="flex flex-col items-center gap-3 text-xs text-white/35">
        <nav className="flex gap-5">
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </nav>
        <p>Movie &amp; TV data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </footer>
    </div>
  );
}
