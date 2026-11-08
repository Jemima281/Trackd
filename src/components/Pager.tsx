"use client";

// Page numbers for long lists: ‹ 1 … 4 5 6 … 12 ›. Hidden for a single page.
export function paginate<T>(items: T[], page: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  return { pageItems: items.slice((current - 1) * size, current * size), pageCount, current };
}

function pagesToShow(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export default function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  const go = (p: number) => {
    onChange(p);
  };
  const btn = "flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold transition";
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-1 py-2">
      <button
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        className={`${btn} text-white/70 hover:bg-white/10 disabled:opacity-30`}
      >
        ‹
      </button>
      {pagesToShow(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-white/30">
            …
          </span>
        ) : (
          <button
            key={p}
            aria-current={p === page ? "page" : undefined}
            onClick={() => go(p)}
            className={`${btn} ${p === page ? "bg-amber-400 text-black" : "text-white/70 hover:bg-white/10"}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
        className={`${btn} text-white/70 hover:bg-white/10 disabled:opacity-30`}
      >
        ›
      </button>
    </nav>
  );
}
