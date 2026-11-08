"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, Field, Message, SubmitButton } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many emails sent recently. Wait a bit and try again."
          : error.message,
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <Message kind="success">
          If <strong>{email}</strong> has a Shuin account, we&apos;ve sent it a link to reset your
          password. Open it on this device, in this browser. Check spam if it doesn&apos;t show up.
        </Message>
        <Link href="/login" className="text-center text-amber-400 hover:underline">
          Back to log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-white/60">
          Enter the email you signed up with and we&apos;ll send you a reset link.
        </p>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        {error && <Message kind="error">{error}</Message>}
        <SubmitButton busy={busy}>Send reset link</SubmitButton>
      </form>
      <Link href="/login" className="text-center text-sm text-white/60 hover:text-white">
        Back to log in
      </Link>
    </AuthCard>
  );
}
