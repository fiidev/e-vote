import type {
  ElectionCreateInput,
  ElectionUpdateInput,
} from "@/features/elections/schemas";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import db from "@/lib/db";

export async function listElections(orgId?: string | null) {
  return db.election.findMany({
    where: orgId ? { organizationId: orgId } : undefined,
    orderBy: { start_time: "desc" },
    include: {
      organization: { select: { id: true, name: true, code: true } },
      _count: {
        select: { candidates: true, votes: true, tokens: true, voters: true },
      },
    },
  });
}

export async function getElection(electionId: string, orgId?: string | null) {
  return db.election.findFirst({
    where: {
      election_id: electionId,
      ...(orgId ? { organizationId: orgId } : {}),
    },
    include: {
      organization: true,
      candidates: { orderBy: { candidate_number: "asc" } },
      _count: { select: { votes: true, tokens: true, voters: true } },
    },
  });
}

export async function createElection(
  data: ElectionCreateInput,
  organizationId: string,
) {
  const { eligible_roles, role_weights, ...rest } = data;
  return db.election.create({
    data: {
      ...rest,
      organizationId,
      eligible_roles: eligible_roles as Role[],
      role_weights:
        role_weights && Object.keys(role_weights).length > 0
          ? (role_weights as Prisma.InputJsonValue)
          : undefined,
    },
  });
}

export async function updateElection(
  data: ElectionUpdateInput,
  orgId?: string | null,
) {
  const { election_id, eligible_roles, role_weights, ...rest } = data;

  if (orgId) {
    const existing = await db.election.findFirst({
      where: { election_id, organizationId: orgId },
    });
    if (!existing) throw new Error("ELECTION_NOT_FOUND");
  }

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

export async function deleteElection(
  electionId: string,
  orgId?: string | null,
) {
  if (orgId) {
    const existing = await db.election.findFirst({
      where: { election_id: electionId, organizationId: orgId },
    });
    if (!existing) throw new Error("ELECTION_NOT_FOUND");
  }

  const [voteCount, usedTokens] = await Promise.all([
    db.vote.count({ where: { election_id: electionId } }),
    db.voteToken.count({ where: { election_id: electionId, is_used: true } }),
  ]);
  if (voteCount > 0 || usedTokens > 0) {
    throw new Error("ELECTION_HAS_VOTES");
  }
  await db.election.delete({ where: { election_id: electionId } });
}
