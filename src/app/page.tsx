import Link from "next/link";
import HomeSwitch from "@/components/HomeSwitch";

const categories = [
  { name: "Anime", icon: "🌸", color: "from-pink-500/30" },
  { name: "Manga", icon: "📖", color: "from-violet-500/30" },
  { name: "Movies", icon: "🎬", color: "from-red-500/30" },
  { name: "TV Shows", icon: "📺", color: "from-sky-500/30" },
  { name: "Albums", icon: "💿", color: "from-emerald-500/30" },
];

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
          you <span className="text-amber-400">watch, read &amp; hear</span>.
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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {categories.map((c) => (
          <div
            key={c.name}
            className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-b ${c.color} to-transparent`}
          >
            <span className="text-4xl">{c.icon}</span>
            <span className="font-semibold">{c.name}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
