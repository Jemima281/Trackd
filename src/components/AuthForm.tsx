// Shared building blocks for the log in and sign up pages.

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-16">
      <h1 className="text-center text-4xl font-black">{title}</h1>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        {...props}
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base outline-none transition focus:border-amber-400"
      />
      {hint && <span className="text-xs font-normal text-white/50">{hint}</span>}
    </label>
  );
}

export function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="rounded-full bg-amber-400 px-6 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
    >
      {busy ? "One sec…" : children}
    </button>
  );
}

export function Message({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-red-400/40 bg-red-400/10 text-red-300"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  return <p className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</p>;
}
