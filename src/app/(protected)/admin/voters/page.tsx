import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listElections } from "@/features/elections/service";
import { VotersClient } from "@/features/voters/components/voters-client";
import { listVoters } from "@/features/voters/service";
import { getAuthUser } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminVotersPage({ searchParams }: PageProps) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const orgId = user.role === "SUPER_ADMIN" ? null : user.organizationId;
  const params = await searchParams;

  const status =
    params.status === "SENT" ||
    params.status === "FAILED" ||
    params.status === "NO_EMAIL"
      ? params.status
      : "ALL";

  const [data, elections] = await Promise.all([
    listVoters(
      {
        page: params.page ? Number(params.page) : 1,
        search: params.q ?? "",
        emailStatus: status === "ALL" ? undefined : status,
      },
      orgId,
    ),
    listElections(orgId),
  ]);

  const electionOptions = elections.map((e) => ({
    election_id: e.election_id,
    title: e.title,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pemilih</h1>
        <p className="text-sm text-ink-muted">
          Kelola data pemilih, token, dan status pengiriman email.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="text-sm text-ink-muted">Memuat data pemilih...</div>
        }
      >
        <VotersClient
          voters={data.items}
          total={data.total}
          page={data.page}
          totalPages={data.totalPages}
          electionOptions={electionOptions}
        />
      </Suspense>
    </div>
  );
}
