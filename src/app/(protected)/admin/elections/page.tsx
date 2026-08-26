import { ElectionsClient } from "@/features/elections/components/elections-client";
import db from "@/lib/db";

/** Halaman daftar pemilihan — server component tipis. */
export default async function AdminElectionsPage() {
  const elections = await db.election.findMany({
    orderBy: { start_time: "desc" },
    include: {
      _count: { select: { candidates: true, votes: true, tokens: true } },
    },
  });

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
