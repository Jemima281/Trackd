"use client";

import { useState } from "react";

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

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

// A labelled input. Password fields get an eye button to show what's typed.
export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  const isPassword = props.type === "password";
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <span className="relative flex">
        <input
          {...props}
          type={isPassword && shown ? "text" : props.type}
          className={`w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base outline-none transition focus:border-amber-400 ${
            isPassword ? "pr-12" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            onClick={(e) => {
              e.preventDefault();
              setShown((s) => !s);
            }}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 hover:text-white"
          >
            <EyeIcon open={shown} />
          </button>
        )}
      </span>
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
