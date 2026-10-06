"use client";

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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer the profile query so it doesn't run inside the auth callback.
      setTimeout(() => load(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
