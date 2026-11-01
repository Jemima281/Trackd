"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type Profile = { id: string; username: string; created_at: string };

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function load(user: User | null) {
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setState({ user, profile: data, loading: false });
    }

    // Fires once on load (INITIAL_SESSION) and again on every sign in/out.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // A password reset link was opened: send them to pick a new password,
      // even if the link landed on another page.
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        router.push("/reset-password");
      }
      // Defer the profile query so it doesn't run inside the auth callback.
      setTimeout(() => load(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
