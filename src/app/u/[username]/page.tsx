import { Suspense } from "react";
import UserProfile from "@/components/UserProfile";

export default function UserPage({ params }: PageProps<"/u/[username]">) {
  // The username is only known at request time, so it's read inside Suspense.
  return (
    <Suspense fallback={<p className="py-24 text-center text-white/50">Loading profile…</p>}>
      <UserProfile params={params} />
    </Suspense>
  );
}
