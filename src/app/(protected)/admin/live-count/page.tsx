import { LiveCountClient } from "@/components/admin/live-count-client";
import db from "@/lib/db";

export default async function LiveCountPage() {
  const elections = await db.election.findMany({
    where: { is_active: true },
    select: { election_id: true, title: true },
    orderBy: { start_time: "desc" },
  });

  return (
    <LiveCountClient
      elections={elections}
      defaultElectionId={elections[0]?.election_id}
    />
  );
}
