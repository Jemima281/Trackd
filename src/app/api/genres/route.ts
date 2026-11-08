import { lookUpGenres } from "@/lib/genreLookup";

// POST { keys: ["anilist:21", "tmdb-movie:129", …] } → { genres: { key: [...] } }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const keys: unknown = body?.keys;
  if (!Array.isArray(keys) || keys.length > 75 || !keys.every((k) => typeof k === "string")) {
    return Response.json({ error: "Send up to 75 keys" }, { status: 400 });
  }
  return Response.json({ genres: await lookUpGenres(keys as string[]) });
}
