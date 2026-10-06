import { matchMany, type MatchRequest } from "@/lib/tmdb";

const MAX_BATCH = 25;

// Matches imported movies/shows (by title+year or IMDb id) to TMDB, with lengths.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const items: MatchRequest[] | undefined = body?.items;
  if (!Array.isArray(items) || items.length > MAX_BATCH) {
    return Response.json({ error: `Send 1–${MAX_BATCH} items` }, { status: 400 });
  }
  return Response.json({ results: await matchMany(items) });
}
