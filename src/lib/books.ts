// Book search via Open Library (free, no key, allows browser requests).
// XP comes from pages: about 1.2 minutes per page at an average reading pace.

import type { MediaResult } from "@/lib/search";

export const MINUTES_PER_PAGE = 1.2;

type OpenLibraryDoc = {
  key: string; // "/works/OL45804W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  subject?: string[];
};

// Open Library subjects mix genres with library bookkeeping; keep the genre-ish ones.
const JUNK_SUBJECT = /accessible|protected daisy|in library|large type|nyt:|lending|internet archive|reading level|open library|staff picks|long now|readers? for|translations into/i;

function genresFrom(subjects: string[] = []) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of subjects) {
    const s = raw.trim();
    if (s.length > 24 || JUNK_SUBJECT.test(s) || /\d/.test(s)) continue;
    const label = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length === 4) break;
  }
  return out;
}

export function fromOpenLibrary(docs: OpenLibraryDoc[]): MediaResult[] {
  return docs
    .filter((d) => d.key?.startsWith("/works/") && d.title)
    .map((d) => {
      const pages = d.number_of_pages_median ?? null;
      return {
        key: `ol:${d.key.replace("/works/", "")}`,
        type: "book" as const,
        title: d.title,
        subtitle: d.author_name?.slice(0, 2).join(", ") ?? null,
        year: d.first_publish_year ?? null,
        cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
        details: pages ? `${pages} pages` : "Book",
        totalUnits: pages && pages > 0 ? Math.min(pages, 20000) : null,
        unitMinutes: MINUTES_PER_PAGE,
        genres: genresFrom(d.subject),
      };
    });
}

export async function searchBooks(query: string) {
  const params = new URLSearchParams({
    q: query,
    limit: "24",
    fields: "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject",
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  const json = await res.json();
  return fromOpenLibrary(json.docs ?? []);
}
