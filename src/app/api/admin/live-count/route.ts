import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CandidateVote {
  candidate_id: string;
  candidate_number: number;
  name: string;
  class_name: string;
  photo_url: string;
  votes: number;
  percentage: number;
}

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const electionId = url.searchParams.get("election_id") || undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const closed = false;

      const push = async () => {
        if (closed) return;
        try {
          const election = await db.election.findFirst({
            where: {
              is_active: true,
              ...(electionId ? { election_id: electionId } : {}),
            },
            include: {
              candidates: {
                orderBy: { candidate_number: "asc" },
                include: { _count: { select: { votes: true } } },
              },
            },
          });

          if (!election) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "NO_ELECTION" })}\n\n`,
              ),
            );
            return;
          }

          const totalVotes = election.candidates.reduce(
            (sum, c) => sum + c._count.votes,
            0,
          );

          const candidates: CandidateVote[] = election.candidates.map((c) => ({
            candidate_id: c.candidate_id,
            candidate_number: c.candidate_number,
            name: c.name,
            class_name: c.class_name,
            photo_url: c.photo_url,
            votes: c._count.votes,
            percentage:
              totalVotes > 0
                ? Math.round((c._count.votes / totalVotes) * 1000) / 10
                : 0,
          }));

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ electionId: election.election_id, electionTitle: election.title, candidates, totalVotes })}\n\n`,
            ),
          );
        } catch {
          // Silent fail
        }
      };

      await push();
      const _interval = setInterval(push, 2000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
