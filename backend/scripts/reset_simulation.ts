import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://76f58b0636336bf4d22a41e00c7ee671a79cd1ff93999b522855dbd9450852e7:sk_OLpjhtthcB9yB5vWxZkcU@pooled.db.prisma.io:5432/postgres?sslmode=require";

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  const electionId = "5934fe7d-2c80-43f4-8ec3-150f2c633008";
  console.log("==> Checking current status...");
  const totalTokens = await db.voteToken.count({ where: { election_id: electionId } });
  const usedTokens = await db.voteToken.count({ where: { election_id: electionId, is_used: true } });
  const totalVotes = await db.vote.count({ where: { election_id: electionId } });
  console.log(`Current: totalTokens=${totalTokens}, usedTokens=${usedTokens}, totalVotes=${totalVotes}`);

  console.log("==> Resetting simulasi...");
  const deletedVotes = await db.vote.deleteMany({ where: { election_id: electionId } });
  console.log(`Deleted votes: ${deletedVotes.count}`);

  const resetTokens = await db.voteToken.updateMany({
    where: { election_id: electionId },
    data: { is_used: false, used_at: null },
  });
  console.log(`Reset tokens: ${resetTokens.count} tokens set to is_used = false`);

  const unusedTokensAfter = await db.voteToken.count({ where: { election_id: electionId, is_used: false } });
  console.log(`==> Selesai! Unused tokens now: ${unusedTokensAfter}`);
}

main()
  .catch((e) => {
    console.error("Error resetting:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
