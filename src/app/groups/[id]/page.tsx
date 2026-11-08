import { Suspense } from "react";
import GroupView from "@/components/GroupView";

export default function GroupPage({ params }: PageProps<"/groups/[id]">) {
  return (
    <Suspense fallback={<p className="py-24 text-center text-white/50">Loading group…</p>}>
      <GroupView params={params} />
    </Suspense>
  );
}
