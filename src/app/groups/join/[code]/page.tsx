import { Suspense } from "react";
import GroupJoin from "@/components/GroupJoin";

export default function JoinGroupPage({ params }: PageProps<"/groups/join/[code]">) {
  return (
    <Suspense fallback={<p className="py-24 text-center text-white/50">Loading invite…</p>}>
      <GroupJoin params={params} />
    </Suspense>
  );
}
