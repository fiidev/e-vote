import type {
  CandidateCreateInput,
  CandidateUpdateInput,
} from "@/features/candidates/schemas";
import db from "@/lib/db";

export async function listCandidates(
  electionId?: string,
  orgId?: string | null,
) {
  return db.candidate.findMany({
    where: {
      ...(electionId ? { election_id: electionId } : {}),
      ...(orgId ? { election: { organizationId: orgId } } : {}),
    },
    orderBy: [{ election_id: "asc" }, { candidate_number: "asc" }],
    include: {
      election: { select: { title: true, organizationId: true } },
      _count: { select: { votes: true } },
    },
  });
}

export async function getCandidate(candidateId: string, orgId?: string | null) {
  return db.candidate.findFirst({
    where: {
      candidate_id: candidateId,
      ...(orgId ? { election: { organizationId: orgId } } : {}),
    },
  });
}

export async function createCandidate(
  data: CandidateCreateInput,
  orgId?: string | null,
) {
  if (orgId) {
    const election = await db.election.findFirst({
      where: { election_id: data.election_id, organizationId: orgId },
    });
    if (!election) throw new Error("ELECTION_NOT_FOUND");
  }

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

export async function updateCandidate(
  data: CandidateUpdateInput,
  orgId?: string | null,
) {
  const { candidate_id, ...rest } = data;

  if (orgId) {
    const candidate = await db.candidate.findFirst({
      where: { candidate_id, election: { organizationId: orgId } },
    });
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
  }

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

export async function deleteCandidate(
  candidateId: string,
  orgId?: string | null,
) {
  if (orgId) {
    const candidate = await db.candidate.findFirst({
      where: { candidate_id: candidateId, election: { organizationId: orgId } },
    });
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
  }

  const voteCount = await db.vote.count({
    where: { candidate_id: candidateId },
  });
  if (voteCount > 0) {
    throw new Error("CANDIDATE_HAS_VOTES");
  }
  await db.candidate.delete({ where: { candidate_id: candidateId } });
}
