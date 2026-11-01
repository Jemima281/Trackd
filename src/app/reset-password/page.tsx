"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AuthCard, Field, Message, SubmitButton } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/client";

// Opened from the reset email: the link signs the user in, then they pick a
// new password here.
export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        error.code === "same_password"
          ? "That's your current password. Pick a new one."
          : error.message,
      );
      return;
    }
    router.push("/profile");
  }

  if (loading) return <p className="py-24 text-center text-white/50">Loading…</p>;

  if (!user) {
    return (
      <AuthCard title="Link expired">
        <Message kind="error">
          This reset link has expired or was opened in a different browser. Request a new one and
          open it on the same device.
        </Message>
        <Link
          href="/forgot-password"
          className="rounded-full bg-amber-400 px-6 py-3 text-center font-bold text-black hover:bg-amber-300"
        >
          Send a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="New password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="New password"
          type="password"
          hint="At least 6 characters"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Field
          label="Type it again"
          type="password"
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error && <Message kind="error">{error}</Message>}
        <SubmitButton busy={busy}>Save new password</SubmitButton>
      </form>
    </AuthCard>
  );
}
