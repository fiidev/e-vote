import { redirect } from "next/navigation";
import { LiveCountClient } from "@/features/live-count/components/live-count-client";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";

export default async function LiveCountPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const orgId = user.role === "SUPER_ADMIN" ? null : user.organizationId;

  const elections = await db.election.findMany({
    where: {
      is_active: true,
      ...(orgId ? { organizationId: orgId } : {}),
    },
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
