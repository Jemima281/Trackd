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
        error.message === "Email not confirmed"
          ? "Please click the confirmation link we emailed you first."
          : "Wrong email or password.",
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
