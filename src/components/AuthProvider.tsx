"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner: string | null;
  favorites: string[];
};

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState & { refreshProfile: () => Promise<void> }>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await createClient().from("profiles").select("*").eq("id", userId).maybeSingle();
  // Columns added later may be missing until the matching migration has run.
  return data ? { ...data, favorites: data.favorites ?? [] } : null;
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
      setState({ user, profile: await fetchProfile(user.id), loading: false });
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

  // After editing your profile, so the nav and pages show the changes.
  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, refreshProfile }}>{children}</AuthContext.Provider>
  );
}
