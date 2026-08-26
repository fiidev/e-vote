import { VoteError } from "@/features/voting/errors";
import type {
  CastVoteOutput,
  VerifyTokenOutput,
} from "@/features/voting/schemas";
import { Prisma } from "@/generated/prisma/client";
import db from "@/lib/db";
import { rateLimiter } from "@/lib/utils/rate-limit";

/**
 * Core business logic voting.
 * Semua kesalahan domain dilempar sebagai VoteError (lihat errors.ts),
 * sehingga layer action/UI cukup membaca .code untuk menampilkan pesan.
 */

export interface ElectionWithCandidates {
  election_id: string;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date;
  is_active: boolean;
  candidates: Candidate[];
}

type Candidate = {
  candidate_id: string;
  election_id: string;
  candidate_number: number;
  name: string;
  class_name: string;
  photo_url: string;
  vision: string;
  mission: string;
};

/** Ambil pemilu aktif beserta kandidatnya (urut nomor urut). */
export async function getActiveElection(): Promise<ElectionWithCandidates> {
  const now = new Date();
  const election = await db.election.findFirst({
    where: {
      is_active: true,
      start_time: { lte: now },
      end_time: { gte: now },
    },
    include: {
      candidates: { orderBy: { candidate_number: "asc" } },
    },
  });

  if (!election) throw new VoteError("ELECTION_NOT_FOUND");
  return election;
}

/**
 * Verifikasi token (langkah 1: halaman verify → redirect ke /vote).
 * Sukses: kembalikan voterId + electionId (untuk cek ALREADY_VOTED di UI).
 */
export async function verifyToken(
  input: VerifyTokenOutput,
): Promise<{ voterId: string; electionId: string }> {
  const token = input.token;

  // 1. Rate limit (per-token & global) — jangan sentuh DB kalau kena blok.
  if (rateLimiter.isTokenLocked(token)) throw new VoteError("TOKEN_LOCKED");
  if (rateLimiter.isGloballyThrottled()) throw new VoteError("RATE_LIMITED");

  // 2. Cari token.
  const found = await db.voteToken.findUnique({
    where: { token_code: token },
    include: { voter: true, election: true },
  });

  if (!found) {
    rateLimiter.recordTokenFailure(token);
    rateLimiter.recordGlobalFailure();
    throw new VoteError("TOKEN_INVALID");
  }

  if (found.is_used) {
    rateLimiter.recordTokenFailure(token);
    rateLimiter.recordGlobalFailure();
    throw new VoteError("TOKEN_ALREADY_USED");
  }

  // 3. Cek jendela waktu pemilu.
  const now = new Date();
  if (now < found.election.start_time) {
    rateLimiter.recordTokenFailure(token);
    throw new VoteError("ELECTION_NOT_STARTED");
  }
  if (now > found.election.end_time) {
    rateLimiter.recordTokenFailure(token);
    throw new VoteError("ELECTION_ENDED");
  }

  // 4. Cek eligibilitas role.
  if (!found.election.eligible_roles.includes(found.voter.role)) {
    rateLimiter.recordTokenFailure(token);
    throw new VoteError("VOTER_NOT_ELIGIBLE");
  }

  // Token valid → reset counter percobaan token ini.
  rateLimiter.resetTokenAttempts(token);

  return { voterId: found.voter_id, electionId: found.election_id };
}

/**
 * Cast vote (langkah 2: halaman /vote). Atomic dalam satu transaksi:
 *  - updateMany bersyarat is_used=false → mencegah double-vote meski race.
 *  - Vote disimpan dengan voter_id (hybrid anonymity: untuk rekonsiliasi,
 *    tidak pernah dirender di UI).
 */
export async function castVote(input: {
  token: string;
  candidateId: CastVoteOutput["candidateId"];
}): Promise<void> {
  const token = input.token;

  if (rateLimiter.isTokenLocked(token)) throw new VoteError("TOKEN_LOCKED");
  if (rateLimiter.isGloballyThrottled()) throw new VoteError("RATE_LIMITED");

  try {
    await db.$transaction(async (tx) => {
      // Baca ulang token di dalam transaksi — jangan percaya session client.
      const found = await tx.voteToken.findUnique({
        where: { token_code: token },
        include: { voter: true, election: true },
      });

      if (!found) throw new VoteError("TOKEN_INVALID");
      if (found.is_used) throw new VoteError("TOKEN_ALREADY_USED");

      const now = new Date();
      if (now < found.election.start_time)
        throw new VoteError("ELECTION_NOT_STARTED");
      if (now > found.election.end_time) throw new VoteError("ELECTION_ENDED");

      if (!found.election.eligible_roles.includes(found.voter.role)) {
        throw new VoteError("VOTER_NOT_ELIGIBLE");
      }

      // Kandidat harus milik pemilu yang sama — cegah cross-election vote.
      const candidate = await tx.candidate.findFirst({
        where: {
          candidate_id: input.candidateId,
          election_id: found.election_id,
        },
      });
      if (!candidate) throw new VoteError("CANDIDATE_NOT_FOUND");

      // Atomic claim token. Kalau count 0 → sudah dipakai (race condition).
      const claimed = await tx.voteToken.updateMany({
        where: { token_id: found.token_id, is_used: false },
        data: { is_used: true, used_at: now },
      });
      if (claimed.count === 0) throw new VoteError("TOKEN_ALREADY_USED");

      await tx.vote.create({
        data: {
          election_id: found.election_id,
          voter_id: found.voter_id,
          candidate_id: candidate.candidate_id,
        },
      });
    });
  } catch (error) {
    // VoteError domain → teruskan apa adanya.
    if (error instanceof VoteError) throw error;
    // Unique constraint violation (race double-vote) → interpretasikan.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new VoteError("TOKEN_ALREADY_USED");
    }
    throw error;
  }

  rateLimiter.resetTokenAttempts(token);
}
