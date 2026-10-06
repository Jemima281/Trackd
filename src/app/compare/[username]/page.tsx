import { Suspense } from "react";
import HeadToHead from "@/components/HeadToHead";

export default function ComparePage({ params }: PageProps<"/compare/[username]">) {
  // The username is only known at request time, so it's read inside Suspense.
  return (
    <Suspense fallback={<p className="py-24 text-center text-white/50">Loading…</p>}>
      <HeadToHead params={params} />
    </Suspense>
  );
}
