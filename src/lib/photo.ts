import { createClient } from "@/lib/supabase/client";

// Profile pictures: cropped to a centred square and shrunk on the device
// before uploading (small files, and no hidden photo data such as GPS).

const SIZE = 320;
const BUCKET = "avatars";

export async function squarePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That isn't an image.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that image. Try a JPG or PNG.");
  });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))), "image/jpeg", 0.85),
  );
}

// Upload into the user's own folder; a new name each time so phones don't
// keep showing a cached old picture.
export async function uploadPhoto(userId: string, photo: Blob) {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const storage = createClient().storage.from(BUCKET);
  const { error } = await storage.upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

// Remove an old picture after it's been replaced or removed. Best effort.
export async function deletePhoto(url: string | null | undefined) {
  const marker = `/object/public/${BUCKET}/`;
  if (!url || !url.includes(marker)) return;
  const path = decodeURIComponent(url.split(marker)[1]);
  await createClient().storage.from(BUCKET).remove([path]).catch(() => {});
}
