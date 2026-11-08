import { Suspense } from "react";
import StatsView from "@/components/StatsView";

export default function StatsPage({ params }: PageProps<"/u/[username]/stats/[category]">) {
  // The username and category are only known at request time, so read them inside Suspense.
  return (
    <Suspense fallback={<p className="py-24 text-center text-white/50">Loading stats…</p>}>
      <StatsView params={params} />
    </Suspense>
  );
}
