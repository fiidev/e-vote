import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";
import { buildRecapBuffer } from "@/lib/excel/service";

/**
 * GET /api/admin/elections/recap?election_id=…
 * Unduh rekapitulasi perolehan suara per kandidat dalam format Excel (.xlsx).
 */
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const electionId = url.searchParams.get("election_id");
  if (!electionId) {
    return new Response("Missing election_id", { status: 400 });
  }

  const election = await db.election.findUnique({
    where: { election_id: electionId },
    include: {
      candidates: {
        orderBy: { candidate_number: "asc" },
        include: { _count: { select: { votes: true } } },
      },
    },
  });

  if (!election) {
    return new Response("Election not found", { status: 404 });
  }

  // Cek hak akses jika bukan SUPER_ADMIN
  if (
    user.role === "ORG_ADMIN" &&
    user.organizationId &&
    election.organizationId !== user.organizationId
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const totalVotes = election.candidates.reduce(
    (sum, c) => sum + c._count.votes,
    0,
  );

  const rows = election.candidates.map((c) => ({
    electionTitle: election.title,
    candidateNumber: c.candidate_number,
    candidateName: c.name,
    className: c.class_name,
    votes: c._count.votes,
    percentage:
      totalVotes > 0
        ? `${Math.round((c._count.votes / totalVotes) * 1000) / 10}%`
        : "0%",
  }));

  const safeTitle = election.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const buffer = buildRecapBuffer(rows);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekap-suara-${safeTitle}.xlsx"`,
    },
  });
}
