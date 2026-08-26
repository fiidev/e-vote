import type {
  VoterCreateInput,
  VoterUpdateInput,
} from "@/features/voters/schemas";
import type { Role } from "@/generated/prisma/enums";
import db from "@/lib/db";

const VOTER_PAGE_SIZE = 50;

export interface VoterListParams {
  page?: number;
  search?: string;
  electionId?: string;
  emailStatus?: "SENT" | "FAILED" | "NO_EMAIL" | "RESEND" | "ALL";
}

export async function listVoters(
  params: VoterListParams = {},
  orgId?: string | null,
) {
  const page = Math.max(1, params.page ?? 1);
  const take = VOTER_PAGE_SIZE;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};

  if (orgId || params.electionId) {
    where.election = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(params.electionId ? { election_id: params.electionId } : {}),
    };
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  switch (params.emailStatus) {
    case "SENT":
    case "RESEND":
      where.tokens = { some: { email_sent_at: { not: null } } };
      break;
    case "FAILED":
      where.tokens = { some: { email_error: { not: null } } };
      break;
    case "NO_EMAIL":
      where.tokens = { some: { email_sent_at: null } };
      break;
    default:
      break;
  }

  const [items, total] = await Promise.all([
    db.voter.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      include: {
        election: { select: { title: true, election_id: true } },
        tokens: {
          select: {
            token_id: true,
            token_code: true,
            is_used: true,
            email_sent_at: true,
            email_error: true,
            election: { select: { title: true } },
          },
        },
      },
    }),
    db.voter.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getVoter(voterId: string, orgId?: string | null) {
  return db.voter.findFirst({
    where: {
      voter_id: voterId,
      ...(orgId ? { election: { organizationId: orgId } } : {}),
    },
    include: {
      election: true,
      tokens: {
        include: { election: { select: { title: true } } },
      },
    },
  });
}

export async function createVoter(
  data: VoterCreateInput,
  orgId?: string | null,
) {
  if (orgId) {
    const election = await db.election.findFirst({
      where: { election_id: data.election_id, organizationId: orgId },
    });
    if (!election) throw new Error("ELECTION_NOT_FOUND");
  }

  return db.voter.create({
    data: {
      election_id: data.election_id,
      name: data.name,
      email: data.email,
      role: data.role as Role,
      generation: data.generation ?? null,
    },
  });
}

export async function updateVoter(
  data: VoterUpdateInput,
  orgId?: string | null,
) {
  const { voter_id, role, ...rest } = data;

  if (orgId) {
    const voter = await db.voter.findFirst({
      where: { voter_id, election: { organizationId: orgId } },
    });
    if (!voter) throw new Error("VOTER_NOT_FOUND");
  }

  return db.voter.update({
    where: { voter_id },
    data: {
      ...rest,
      ...(role !== undefined && { role: role as Role }),
    },
  });
}

export async function deleteVoter(voterId: string, orgId?: string | null) {
  if (orgId) {
    const voter = await db.voter.findFirst({
      where: { voter_id: voterId, election: { organizationId: orgId } },
    });
    if (!voter) throw new Error("VOTER_NOT_FOUND");
  }

  const [voteCount, usedTokens] = await Promise.all([
    db.vote.count({ where: { voter_id: voterId } }),
    db.voteToken.count({ where: { voter_id: voterId, is_used: true } }),
  ]);
  if (voteCount > 0 || usedTokens > 0) {
    throw new Error("VOTER_HAS_VOTED");
  }
  await db.voter.delete({ where: { voter_id: voterId } });
}

export async function updateVoterEmail(
  voterId: string,
  email: string,
  orgId?: string | null,
) {
  if (orgId) {
    const voter = await db.voter.findFirst({
      where: { voter_id: voterId, election: { organizationId: orgId } },
    });
    if (!voter) throw new Error("VOTER_NOT_FOUND");
  }

  return db.voter.update({
    where: { voter_id: voterId },
    data: { email: email.toLowerCase().trim() },
  });
}

export async function listRecentEmailLogs(
  params: { limit?: number } = {},
  orgId?: string | null,
) {
  return db.emailLog.findMany({
    where: orgId
      ? { voter: { election: { organizationId: orgId } } }
      : undefined,
    orderBy: { sent_at: "desc" },
    take: params.limit ?? 20,
    include: {
      voter: { select: { name: true, email: true } },
      token: { select: { token_code: true } },
    },
  });
}
