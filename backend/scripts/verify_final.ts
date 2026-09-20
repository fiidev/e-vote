import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://76f58b0636336bf4d22a41e00c7ee671a79cd1ff93999b522855dbd9450852e7:sk_OLpjhtthcB9yB5vWxZkcU@pooled.db.prisma.io:5432/postgres?sslmode=require";

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  const electionId = "5934fe7d-2c80-43f4-8ec3-150f2c633008";
  const totalVotes = await db.vote.count({ where: { election_id: electionId } });
  const totalTokens = await db.voteToken.count({ where: { election_id: electionId } });
  const usedTokens = await db.voteToken.count({ where: { election_id: electionId, is_used: true } });
  const unusedTokens = await db.voteToken.count({ where: { election_id: electionId, is_used: false } });
  const candidates = await db.candidate.findMany({
    where: { election_id: electionId },
    select: { candidate_number: true, name: true, _count: { select: { votes: true } } },
    orderBy: { candidate_number: "asc" }
  });

  console.log("=== FINAL VERIFICATION REPORT ===");
  console.log("Total Votes Recorded in DB :", totalVotes);
  console.log("Total Tokens in Election   :", totalTokens);
  console.log("Used Tokens (is_used=true) :", usedTokens);
  console.log("Unused Tokens Remaining    :", unusedTokens);
  console.log("Candidate Vote Breakdown   :", JSON.stringify(candidates, null, 2));
}

main().finally(() => db.$disconnect());
