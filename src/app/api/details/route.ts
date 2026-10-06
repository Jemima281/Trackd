import { lookUpLength } from "@/lib/details";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  try {
    return Response.json(await lookUpLength(key), {
      // Lengths basically never change; cache for a day.
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    console.error("Length lookup failed:", err);
    return Response.json({ error: "Couldn't look up length" }, { status: 502 });
  }
}
