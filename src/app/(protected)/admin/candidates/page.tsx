import { redirect } from "next/navigation";
import { CandidatesClient } from "@/features/candidates/components/candidates-client";
import { listCandidates } from "@/features/candidates/service";
import { listElections } from "@/features/elections/service";
import { getAuthUser } from "@/lib/auth";

export default async function AdminCandidatesPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const orgId = user.role === "SUPER_ADMIN" ? null : user.organizationId;

  const [candidates, elections] = await Promise.all([
    listCandidates(undefined, orgId),
    listElections(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Kandidat</h1>
        <p className="text-sm text-ink-muted">
          Kelola kandidat untuk setiap pemilihan.
        </p>
      </div>
      <CandidatesClient candidates={candidates} elections={elections} />
    </div>
  );
}
