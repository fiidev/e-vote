import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import type {
  CandidateCreateInput,
  CandidateUpdateInput,
  ElectionCreateInput,
  ElectionUpdateInput,
  VoterCreateInput,
  VoterUpdateInput,
} from "@/lib/admin/schemas";
import db from "@/lib/db";

/**
 * Admin data layer — semua query CRUD + pagination.
 * Murni data access (tidak ada logika bisnis berat; logika token/weights
 * ada di tokens.ts & weights.ts). Error contract dipakai di actions.
 */

// ─── Elections ────────────────────────────────────────────────────────────

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

// ─── Candidates ───────────────────────────────────────────────────────────

export async function listCandidates(electionId?: string) {
  return db.candidate.findMany({
    where: electionId ? { election_id: electionId } : undefined,
    orderBy: [{ election_id: "asc" }, { candidate_number: "asc" }],
    include: {
      election: { select: { title: true } },
      _count: { select: { votes: true } },
    },
  });
}

export async function getCandidate(candidateId: string) {
  return db.candidate.findUnique({ where: { candidate_id: candidateId } });
}

export async function createCandidate(data: CandidateCreateInput) {
  const existing = await db.candidate.findFirst({
    where: {
      election_id: data.election_id,
      candidate_number: data.candidate_number,
    },
  });
  if (existing) {
    throw new Error("CANDIDATE_NUMBER_EXISTS");
  }

  return db.candidate.create({
    data: {
      ...data,
      photo_url: data.photo_url ?? "",
    },
  });
}

export async function updateCandidate(data: CandidateUpdateInput) {
  const { candidate_id, ...rest } = data;
  if (rest.candidate_number !== undefined || rest.election_id !== undefined) {
    const current = await db.candidate.findUnique({
      where: { candidate_id },
      select: { election_id: true, candidate_number: true },
    });
    if (current) {
      const electionId = rest.election_id ?? current.election_id;
      const candidateNumber = rest.candidate_number ?? current.candidate_number;
      const duplicate = await db.candidate.findFirst({
        where: {
          election_id: electionId,
          candidate_number: candidateNumber,
          candidate_id: { not: candidate_id },
        },
      });
      if (duplicate) {
        throw new Error("CANDIDATE_NUMBER_EXISTS");
      }
    }
  }

  return db.candidate.update({
    where: { candidate_id },
    data: {
      ...rest,
      ...(rest.photo_url !== undefined && { photo_url: rest.photo_url ?? "" }),
    },
  });
}

export async function deleteCandidate(candidateId: string) {
  const voteCount = await db.vote.count({
    where: { candidate_id: candidateId },
  });
  if (voteCount > 0) {
    throw new Error("CANDIDATE_HAS_VOTES");
  }
  await db.candidate.delete({ where: { candidate_id: candidateId } });
}

// ─── Voters ───────────────────────────────────────────────────────────────

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

// ─── Email logs ───────────────────────────────────────────────────────────

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
