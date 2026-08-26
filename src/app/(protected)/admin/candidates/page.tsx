import { CandidatesClient } from "@/features/candidates/components/candidates-client";
import db from "@/lib/db";

/** Halaman daftar kandidat — server component tipis, UI di CandidatesClient. */
export default async function AdminCandidatesPage() {
  const [candidates, elections] = await Promise.all([
    db.candidate.findMany({
      orderBy: [{ election_id: "asc" }, { candidate_number: "asc" }],
      include: {
        election: { select: { title: true } },
        _count: { select: { votes: true } },
      },
    }),
    db.election.findMany({
      orderBy: { start_time: "desc" },
      select: { election_id: true, title: true },
    }),
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
