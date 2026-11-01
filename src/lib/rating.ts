// Ratings are 0.0–10.0 in steps of 0.1; null means "not rated".

export function formatRating(r: number) {
  return r.toFixed(1);
}

// Snap any number to a valid rating (one decimal, 0–10).
export function cleanRating(r: number) {
  return Math.min(10, Math.max(0, Math.round(r * 10) / 10));
}

// Text colour by score: red for low, amber for middling, green for high.
export function ratingColor(r: number) {
  if (r >= 8.5) return "text-emerald-400";
  if (r >= 7) return "text-lime-300";
  if (r >= 5) return "text-amber-400";
  if (r >= 3) return "text-orange-400";
  return "text-red-400";
}
