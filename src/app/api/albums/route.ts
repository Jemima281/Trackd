import { searchAlbumsOnServer } from "@/lib/albums";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ results: [] });

  try {
    const results = await searchAlbumsOnServer(query);
    return Response.json(
      { results },
      // Let Vercel's CDN reuse answers for an hour so popular searches are instant.
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("Album search failed:", err);
    return Response.json({ error: "Album search is unavailable" }, { status: 502 });
  }
}
