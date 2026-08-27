import { redirect } from "next/navigation";
import { ElectionsClient } from "@/features/elections/components/elections-client";
import { listElections } from "@/features/elections/service";
import { getAuthUser } from "@/lib/auth";

export default async function AdminElectionsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const orgId = user.role === "SUPER_ADMIN" ? null : user.organizationId;
  const elections = await listElections(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pemilihan</h1>
        <p className="text-sm text-ink-muted">
          Kelola jadwal, role pemilih, dan sistem perhitungan suara.
        </p>
      </div>
      <ElectionsClient elections={elections} />
    </div>
  );
}
