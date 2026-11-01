"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthCard, Field, Message, SubmitButton } from "@/components/AuthForm";

export default function LogInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);

    if (error) {
      setError(
        error.code === "invalid_credentials"
          ? "Wrong email or password."
          : error.code === "email_not_confirmed"
            ? "Please click the confirmation link we emailed you first."
            : error.status === 429
              ? "Too many attempts. Wait a minute and try again."
              : error.name === "AuthRetryableFetchError" || !error.status
                ? "Couldn't reach the server. Check your connection, or try again in a minute."
                : // Anything else: show the real reason.
                  `Couldn't log in: ${error.message}`,
      );
      return;
    }
    router.push("/profile");
  }

  return (
    <AuthCard title="Welcome back">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Link href="/forgot-password" className="-mt-2 self-end text-sm text-amber-400 hover:underline">
          Forgot password?
        </Link>
        {error && <Message kind="error">{error}</Message>}
        <SubmitButton busy={busy}>Log in</SubmitButton>
      </form>
      <p className="text-center text-sm text-white/60">
        New here?{" "}
        <Link href="/signup" className="text-amber-400 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
