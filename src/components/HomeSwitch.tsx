"use client";

import { useAuth } from "@/components/AuthProvider";
import HomeFeed from "@/components/HomeFeed";

// Logged in → activity feed; logged out → the landing page passed in.
export default function HomeSwitch({ landing }: { landing: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <HomeFeed /> : landing;
}
