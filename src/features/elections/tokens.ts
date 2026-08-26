import { randomInt } from "node:crypto";
import type { Role } from "@/generated/prisma/enums";
import db from "@/lib/db";

/**
 * Token generation — 8 digit numerik (format display XXXX-XXXX).
 * Hanya voter dengan role yang eligible (terdaftar di Election.eligible_roles)
 * yang menerima token; voter yang sudah punya token di election tsb di-skip.
 * Anti double-vote dijamin unique([voter_id, election_id]) di schema.
 */

export const TOKEN_LENGTH = 8;

/** Generate 8-digit numeric token sebagai string. */
export function generateTokenCode(): string {
  return randomInt(0, 10 ** TOKEN_LENGTH)
    .toString()
    .padStart(TOKEN_LENGTH, "0");
}

export interface TokenGenerationResult {
  created: number;
  skippedNoEligible: number;
  skippedAlreadyHasToken: number;
  tokenCodes: string[];
}

export async function generateTokensForElection(
  electionId: string,
  opts: { limit?: number } = {},
): Promise<TokenGenerationResult> {
  const election = await db.election.findUnique({
    where: { election_id: electionId },
    select: {
      eligible_roles: true,
      tokens: { select: { voter_id: true } },
    },
  });
  if (!election) {
    throw new Error("ELECTION_NOT_FOUND");
  }

  const eligibleRoles = election.eligible_roles as string[];
  const existingVoterIds = new Set(election.tokens.map((t) => t.voter_id));

  const eligibleVoters = await db.voter.findMany({
    where: { role: { in: eligibleRoles as Role[] } },
    select: { voter_id: true },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  const targets = eligibleVoters.filter(
    (v) => !existingVoterIds.has(v.voter_id),
  );
  const skippedAlreadyHasToken = eligibleVoters.length - targets.length;

  // Generate token unik (retry kalau collision)
  const used = new Set<string>();
  const codes: string[] = [];
  for (let i = 0; i < targets.length; i++) {
    let code = generateTokenCode();
    let guard = 0;
    while (used.has(code) && guard < 10) {
      code = generateTokenCode();
      guard++;
    }
    used.add(code);
    codes.push(code);
  }

  if (targets.length > 0) {
    await db.voteToken.createMany({
      data: targets.map((v, i) => ({
        voter_id: v.voter_id,
        election_id: electionId,
        token_code: codes[i],
      })),
    });
  }

  return {
    created: targets.length,
    skippedNoEligible: 0, // role tidak eligible tidak pernah terpilih di atas
    skippedAlreadyHasToken,
    tokenCodes: codes,
  };
}

export interface TokenInfo {
  voter_id: string;
  voter_name: string;
  voter_email: string;
  token_id: string;
  token_code: string;
  email_sent_at: Date | null;
  email_error: string | null;
}

/** Token untuk satu voter di semua election (dipakai halaman voters). */
export async function getVoterTokens(voterId: string): Promise<TokenInfo[]> {
  const voter = await db.voter.findUnique({
    where: { voter_id: voterId },
    select: {
      voter_id: true,
      name: true,
      email: true,
      tokens: {
        select: {
          token_id: true,
          token_code: true,
          email_sent_at: true,
          email_error: true,
        },
      },
    },
  });
  if (!voter) return [];
  return voter.tokens.map((t) => ({
    voter_id: voter.voter_id,
    voter_name: voter.name,
    voter_email: voter.email,
    ...t,
  }));
}
