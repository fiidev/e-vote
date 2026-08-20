import { VotersClient } from "@/components/admin/voters-client";
import { listVoters } from "@/lib/admin/service";
import db from "@/lib/db";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

/** Halaman daftar pemilih — server component tipis, searchParams untuk filter. */
export default async function AdminVotersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const status =
    params.status === "SENT" ||
    params.status === "FAILED" ||
    params.status === "NO_EMAIL"
      ? params.status
      : "ALL";

  const [data, electionOptions] = await Promise.all([
    listVoters({
      page: params.page ? Number(params.page) : 1,
      search: params.q ?? "",
      emailStatus: status === "ALL" ? undefined : status,
    }),
    db.election.findMany({
      orderBy: { start_time: "desc" },
      select: { election_id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pemilih</h1>
        <p className="text-sm text-ink-muted">
          Kelola data pemilih, token, dan status pengiriman email.
        </p>
      </div>
      <VotersClient
        voters={data.items}
        total={data.total}
        page={data.page}
        totalPages={data.totalPages}
        electionOptions={electionOptions}
      />
    </div>
  );
}
