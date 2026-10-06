"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthCard, Field, Message, SubmitButton } from "@/components/AuthForm";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(name)) {
      setError("Usernames are 3–20 characters: letters, numbers and _ only.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", name)
      .maybeSingle();
    if (taken) {
      setError(`Sorry, @${name} is already taken.`);
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: name } },
    });
    setBusy(false);

    if (error) {
      setError(
        error.message.includes("Database error")
          ? `Sorry, @${name} is already taken.`
          : error.message,
      );
      return;
    }

    // With email confirmation on, there's no session until they click the link.
    if (data.session) router.push("/profile");
    else setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <AuthCard title="Check your email">
        <Message kind="success">
          We sent a confirmation link to <strong>{email}</strong>. Click it, then
          come back and log in.
        </Message>
        <Link href="/login" className="text-center text-amber-400 hover:underline">
          Go to log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Join Trackd">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Username"
          hint="3–20 characters: letters, numbers and _"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          autoComplete="username"
          required
        />
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
          hint="At least 6 characters"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error && <Message kind="error">{error}</Message>}
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="text-center text-sm text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="text-amber-400 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
