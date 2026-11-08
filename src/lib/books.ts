// Book search via Open Library (free, no key, allows browser requests).
// XP comes from pages: about 1.2 minutes per page at an average reading pace.

import { normalizeGenres } from "@/lib/genres";
import type { MediaResult } from "@/lib/search";

// Reading time per page, by kind of book. A novel page is ~300 words, read at
// ~250 words a minute; comics and picture books go much faster.
export const MINUTES_PER_PAGE = 1.2;
const COMIC_MINUTES_PER_PAGE = 0.5;
const PICTURE_BOOK_MINUTES_PER_PAGE = 0.3;

// Open Library merges subjects from every edition and adaptation (The Hobbit
// has a comic version), so a kind only counts if it's a real share of them.
export function minutesPerPage(subjects: string[] = [], pages: number | null = null) {
  const share = (pattern: RegExp) =>
    subjects.length ? subjects.filter((s) => pattern.test(s)).length / subjects.length : 0;
  // Picture books, and short children's books (which are mostly pictures).
  if (share(/picture books|board books|stories in rhyme/i) >= 0.15) return PICTURE_BOOK_MINUTES_PER_PAGE;
  if (pages && pages <= 64 && share(/picture book|board book|juvenile|children/i) > 0) {
    return PICTURE_BOOK_MINUTES_PER_PAGE;
  }
  if (share(/comic|graphic novel/i) >= 0.15) return COMIC_MINUTES_PER_PAGE;
  return MINUTES_PER_PAGE;
}

// "6h read", "45m read"
export function readingTime(pages: number, minutesEach: number) {
  const minutes = Math.round(pages * minutesEach);
  if (minutes < 60) return `${minutes}m read`;
  return `${Math.round(minutes / 60)}h read`;
}

type OpenLibraryDoc = {
  key: string; // "/works/OL45804W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  edition_count?: number;
  readinglog_count?: number;
  language?: string[]; // every edition's language, e.g. ["eng", "fre"]
  subject?: string[];
};

// Things that share a book's name but aren't the book: study guides, posters,
// box sets, companions, colouring books...
const NOT_THE_BOOK =
  /\b(posters?|colou?ring|coloriage|activity|stickers?|spark ?notes|cliffs? ?notes|study guide|summary|summaries|analysis|box(ed)? ?set|collection\/set|complete series|\d+ books|omnibus|notes|workbook|quiz|trivia|companion|cinematic|guide to|reader'?s guide|unofficial|calendar|journal|crossword|puzzles?|cookbook|screenplay|lego)\b|\(series\)| \/ /i;

// Open Library's 3-letter language codes for the reader's 2-letter one.
const LANGUAGES: Record<string, string> = {
  en: "eng", fr: "fre", es: "spa", de: "ger", it: "ita", pt: "por", nl: "dut",
  ru: "rus", ja: "jpn", ko: "kor", zh: "chi", pl: "pol", tr: "tur", sv: "swe",
};

function words(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
}

// Open Library's search mixes the real book with spin-offs, translations
// filed as their own works and books that only mention it. Keep the ones
// people actually read, in the reader's language, once each.
export function cleanResults(docs: OpenLibraryDoc[], query: string, lang = "en") {
  const wanted = words(query);
  const language = LANGUAGES[lang];
  const readers = (d: OpenLibraryDoc) => (d.readinglog_count ?? 0) + (d.edition_count ?? 0);
  const top = Math.max(0, ...docs.map(readers));
  const seen = new Set<string>();
  return docs.filter((d, i) => {
    if (!d.key?.startsWith("/works/") || !d.title || !d.author_name?.length) return false;
    if (NOT_THE_BOOK.test(d.title)) return false;
    const known = d.language?.filter((l) => l !== "und") ?? [];
    if (language && known.length > 0 && !known.includes(language)) return false;
    // Every search word appears in the title or author (the last one may be
    // half typed).
    const have = words(`${d.title} ${d.author_name.join(" ")}`);
    const matches = wanted.every((w, j) =>
      j === wanted.length - 1 ? have.some((h) => h.startsWith(w)) : have.includes(w),
    );
    // Matches need some readers once the top result is popular. A book without
    // the search words ("Nineteen Eighty-Four" for "1984", "The Lightning
    // Thief" for "percy jackson") must be a big one near the top of Open
    // Library's own ranking.
    const enough = matches
      ? readers(d) >= Math.min(top * 0.01, 100)
      : i < 10 && readers(d) >= Math.max(top * 0.05, 50);
    if (!enough) return false;
    const id = `${words(d.title).join(" ")}|${words(d.author_name[0]).join(" ")}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

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
      // Medians over ~3000 pages are omnibus editions skewing the count.
      const pages = d.number_of_pages_median && d.number_of_pages_median <= 3000 ? d.number_of_pages_median : null;
      const minutes = minutesPerPage(d.subject, pages);
      return {
        key: `ol:${d.key.replace("/works/", "")}`,
        type: "book" as const,
        title: d.title,
        subtitle: d.author_name?.slice(0, 2).join(", ") ?? null,
        year: d.first_publish_year ?? null,
        cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
        details: pages ? `${pages} pages · ${readingTime(pages, minutes)}` : "Book",
        totalUnits: pages && pages > 0 ? pages : null,
        unitMinutes: minutes,
        genres: normalizeGenres(genresFrom(d.subject)),
      };
    });
}

export async function searchBooks(query: string) {
  const lang = (typeof navigator !== "undefined" && navigator.language?.slice(0, 2).toLowerCase()) || "en";
  const params = new URLSearchParams({
    q: query,
    limit: "40", // extra, since cleaning drops some
    lang, // titles in the reader's language where an edition has one
    fields:
      "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject,edition_count,readinglog_count,language",
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  const json = await res.json();
  return fromOpenLibrary(cleanResults(json.docs ?? [], query, lang)).slice(0, 24);
}
