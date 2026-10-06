const colors = [
  "bg-pink-500",
  "bg-violet-500",
  "bg-red-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
];

// A coloured circle with the user's first letter; the colour is picked from
// the username so it stays the same every time.
export default function Avatar({
  username,
  size = "sm",
}: {
  username: string;
  size?: "sm" | "lg";
}) {
  const hash = [...username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const sizing = size === "lg" ? "h-24 w-24 text-4xl" : "h-8 w-8 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black uppercase text-black ${colors[hash % colors.length]} ${sizing}`}
    >
      {username[0]}
    </span>
  );
}
