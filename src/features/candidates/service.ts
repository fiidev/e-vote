import type {
  CandidateCreateInput,
  CandidateUpdateInput,
} from "@/features/candidates/schemas";
import db from "@/lib/db";

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
