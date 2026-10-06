"use client";

import { useEffect, useState } from "react";

// Pings Supabase's auth health endpoint so we can see the connection works.
export default function SupabaseStatus() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  const styles = {
    checking: "text-white/50",
    ok: "text-emerald-400",
    error: "text-red-400",
  };
  const text = {
    checking: "Checking database connection…",
    ok: "● Database connected",
    error: "● Can't reach the database",
  };

  return <p className={`text-xs ${styles[status]}`}>{text[status]}</p>;
}
