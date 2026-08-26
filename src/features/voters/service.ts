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
  emailStatus?: "SENT" | "FAILED" | "NO_EMAIL" | "RESEND" | "ALL";
}

export async function listVoters(params: VoterListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const take = VOTER_PAGE_SIZE;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
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

export async function getVoter(voterId: string) {
  return db.voter.findUnique({
    where: { voter_id: voterId },
    include: {
      tokens: {
        include: { election: { select: { title: true } } },
      },
    },
  });
}

export async function createVoter(data: VoterCreateInput) {
  return db.voter.create({ data: { ...data, role: data.role as Role } });
}

export async function updateVoter(data: VoterUpdateInput) {
  const { voter_id, role, ...rest } = data;
  return db.voter.update({
    where: { voter_id },
    data: {
      ...rest,
      ...(role !== undefined && { role: role as Role }),
    },
  });
}

export async function deleteVoter(voterId: string) {
  const [voteCount, usedTokens] = await Promise.all([
    db.vote.count({ where: { voter_id: voterId } }),
    db.voteToken.count({ where: { voter_id: voterId, is_used: true } }),
  ]);
  if (voteCount > 0 || usedTokens > 0) {
    throw new Error("VOTER_HAS_VOTED");
  }
  await db.voter.delete({ where: { voter_id: voterId } });
}

export async function updateVoterEmail(voterId: string, email: string) {
  return db.voter.update({
    where: { voter_id: voterId },
    data: { email: email.toLowerCase().trim() },
  });
}

export async function getVotersByEmail(email: string) {
  return db.voter.findUnique({ where: { email } });
}

export interface EmailLogListParams {
  limit?: number;
}

export async function listRecentEmailLogs(params: EmailLogListParams = {}) {
  return db.emailLog.findMany({
    orderBy: { sent_at: "desc" },
    take: params.limit ?? 20,
    include: {
      voter: { select: { name: true, email: true } },
      token: { select: { token_code: true } },
    },
  });
}
