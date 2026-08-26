import type {
  ElectionCreateInput,
  ElectionUpdateInput,
} from "@/features/elections/schemas";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import db from "@/lib/db";

export async function listElections() {
  return db.election.findMany({
    orderBy: { start_time: "desc" },
    include: {
      _count: {
        select: { candidates: true, votes: true, tokens: true },
      },
    },
  });
}

export async function getElection(electionId: string) {
  return db.election.findUnique({
    where: { election_id: electionId },
    include: {
      candidates: { orderBy: { candidate_number: "asc" } },
      _count: { select: { votes: true, tokens: true } },
    },
  });
}

export async function createElection(data: ElectionCreateInput) {
  const { eligible_roles, role_weights, ...rest } = data;
  return db.election.create({
    data: {
      ...rest,
      eligible_roles: eligible_roles as Role[],
      role_weights:
        role_weights && Object.keys(role_weights).length > 0
          ? (role_weights as Prisma.InputJsonValue)
          : undefined,
    },
  });
}

export async function updateElection(data: ElectionUpdateInput) {
  const { election_id, eligible_roles, role_weights, ...rest } = data;
  return db.election.update({
    where: { election_id },
    data: {
      ...rest,
      ...(eligible_roles !== undefined && {
        eligible_roles: eligible_roles as Role[],
      }),
      ...(rest.is_weighted === false
        ? { role_weights: Prisma.JsonNull }
        : role_weights !== undefined && {
            role_weights:
              Object.keys(role_weights).length > 0
                ? (role_weights as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          }),
    },
  });
}

export async function deleteElection(electionId: string) {
  const [voteCount, usedTokens] = await Promise.all([
    db.vote.count({ where: { election_id: electionId } }),
    db.voteToken.count({ where: { election_id: electionId, is_used: true } }),
  ]);
  if (voteCount > 0 || usedTokens > 0) {
    throw new Error("ELECTION_HAS_VOTES");
  }
  await db.election.delete({ where: { election_id: electionId } });
}
