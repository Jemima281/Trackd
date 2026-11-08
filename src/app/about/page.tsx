import type { Metadata } from "next";
import { InfoPage, Section } from "@/components/InfoPage";

export const metadata: Metadata = { title: "About · Shuin" };

const SOURCES = [
  { name: "AniList", href: "https://anilist.co", what: "anime, manga and manhwa" },
  { name: "Open Library", href: "https://openlibrary.org", what: "books" },
  { name: "Apple Books", href: "https://books.apple.com", what: "book covers" },
  { name: "MangaUpdates", href: "https://www.mangaupdates.com", what: "chapter counts" },
  { name: "MangaDex", href: "https://mangadex.org", what: "chapter counts" },
  { name: "Wikidata", href: "https://www.wikidata.org", what: "author names" },
];

export default function AboutPage() {
  return (
    <InfoPage title="About Shuin">
      <p>
        Shuin turns everything you watch and read into XP. Log anime, manga, manhwa, movies, TV
        and books, rank up from Bronze to Legend, and see where you stand against your friends.
      </p>

      <Section title="Where the data comes from">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tmdb-logo.svg" alt="TMDB" className="h-4" />
          </a>
          <p className="text-sm">
            Movie and TV information and images come from TMDB. This product uses the TMDB API but
            is not endorsed or certified by TMDB.
          </p>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {SOURCES.map((s) => (
            <li key={s.name}>
              <a href={s.href} target="_blank" rel="noreferrer" className="font-semibold text-white underline-offset-2 hover:underline">
                {s.name}
              </a>{" "}
              — {s.what}
            </li>
          ))}
        </ul>
        <p className="text-sm text-white/50">
          Shuin isn&apos;t affiliated with or endorsed by any of these services. Titles, covers and
          artwork belong to their owners.
        </p>
      </Section>
    </InfoPage>
  );
}
