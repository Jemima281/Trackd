import { AVATAR_COLORS, type AvatarColor } from "@/lib/profile";

const FALLBACK: AvatarColor[] = ["pink", "violet", "red", "sky", "emerald", "amber"];

const SIZES = {
  sm: "h-8 w-8 text-sm",
  md: "h-12 w-12 text-xl",
  lg: "h-24 w-24 text-4xl",
};

// A coloured circle with the user's chosen emoji, or their first letter.
// Without a chosen colour, one is picked from the username so it stays stable.
export default function Avatar({
  username,
  emoji,
  color,
  size = "sm",
}: {
  username: string;
  emoji?: string | null;
  color?: string | null;
  size?: keyof typeof SIZES;
}) {
  const hash = [...username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const bg =
    AVATAR_COLORS[(color as AvatarColor) ?? ""] ?? AVATAR_COLORS[FALLBACK[hash % FALLBACK.length]];
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-black uppercase text-black ${bg} ${SIZES[size]}`}
    >
      {emoji ? <span className="leading-none">{emoji}</span> : username[0]}
    </span>
  );
}
