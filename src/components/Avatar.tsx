/* eslint-disable @next/next/no-img-element -- avatars come from Supabase storage */

// Fallback colours when someone hasn't uploaded a photo; picked from the
// username so each person keeps the same one.
const FALLBACK = ["bg-pink-400", "bg-violet-400", "bg-red-400", "bg-sky-400", "bg-emerald-400", "bg-amber-400"];

const SIZES = {
  sm: "h-8 w-8 text-sm",
  md: "h-12 w-12 text-xl",
  lg: "h-24 w-24 text-4xl",
};

// A round profile picture, or the user's initial if they have none.
export default function Avatar({
  username,
  url,
  size = "sm",
}: {
  username: string;
  url?: string | null;
  size?: keyof typeof SIZES;
}) {
  const sizing = SIZES[size];
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={`shrink-0 rounded-full bg-white/10 object-cover ${sizing}`}
      />
    );
  }
  const hash = [...username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-black uppercase text-black ${FALLBACK[hash % FALLBACK.length]} ${sizing}`}
    >
      {username[0]}
    </span>
  );
}
