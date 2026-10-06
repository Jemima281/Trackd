// Friendly error plus the technical details, so a screenshot shows what broke.
export function describeError(err: unknown) {
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    return [e.code && `[${e.code}]`, e.message, e.details, e.hint].filter(Boolean).join(" ");
  }
  return String(err);
}

export default function LoadError({ what, detail }: { what: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-red-300">Couldn&apos;t load {what}. Try refreshing.</p>
      <p className="max-w-md break-words rounded-xl bg-white/5 px-4 py-2 font-mono text-xs text-white/50">
        {detail}
      </p>
    </div>
  );
}
