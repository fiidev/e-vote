import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";
import { buildTokenListBuffer } from "@/lib/excel/service";

/**
 * GET /api/admin/voters/export?election_id=…
 * Download daftar token voter untuk satu pemilihan (display XXXX-XXXX).
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
      tokens: {
        include: { voter: { select: { name: true, email: true, role: true } } },
      },
    },
  });
  if (!election) {
    return new Response("Election not found", { status: 404 });
  }

  const rows = election.tokens.map((t) => ({
    voterName: t.voter.name,
    voterEmail: t.voter.email,
    role: t.voter.role,
    tokenDisplay: t.token_code,
    emailStatus: t.email_sent_at
      ? "SENT"
      : t.email_error
        ? "FAILED"
        : "NO_EMAIL",
    used: t.is_used ? "Ya" : "Belum",
  }));

  const safeTitle = election.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const buffer = buildTokenListBuffer(rows);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="token-${safeTitle}.xlsx"`,
    },
  });
}
