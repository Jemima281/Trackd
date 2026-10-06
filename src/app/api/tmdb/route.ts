import { searchTmdb } from "@/lib/tmdb";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const query = params.get("q")?.trim() ?? "";

  if (type !== "movie" && type !== "tv") {
    return Response.json({ error: "type must be movie or tv" }, { status: 400 });
  }
  if (query.length < 2) return Response.json({ results: [] });

  try {
    const results = await searchTmdb(type, query);
    return Response.json(
      { results },
      // Let Vercel's CDN reuse answers for an hour so popular searches are instant.
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("TMDB search failed:", err);
    return Response.json({ error: "Movie and TV search is unavailable" }, { status: 502 });
  }
}
