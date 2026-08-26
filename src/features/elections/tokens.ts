import { randomInt } from "node:crypto";
import type { Role } from "@/generated/prisma/enums";
import db from "@/lib/db";

// Crockford Base32 Character Set (Excludes confusing chars: 0, O, 1, I, L)
const CROCKFORD_BASE32 = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateRandomBlock(length = 4): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    const idx = randomInt(0, CROCKFORD_BASE32.length);
    str += CROCKFORD_BASE32[idx];
  }
  return str;
}

/** Generate token dengan format: [ORG_CODE]-[BLOCK1]-[BLOCK2] (cth: MTC-K7X9-2P4W, PST-9N3K-8W2L) */
export function generateTokenCode(orgCode = "EVT"): string {
  const prefix =
    orgCode
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "EVT";
  const block1 = generateRandomBlock(4);
  const block2 = generateRandomBlock(4);
  return `${prefix}-${block1}-${block2}`;
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
      organization: { select: { code: true } },
      tokens: { select: { voter_id: true } },
    },
  });
  if (!election) {
    throw new Error("ELECTION_NOT_FOUND");
  }

  const orgCode = election.organization.code || "EVT";
  const eligibleRoles = election.eligible_roles as Role[];
  const existingVoterIds = new Set(election.tokens.map((t) => t.voter_id));

  const eligibleVoters = await db.voter.findMany({
    where: {
      election_id: electionId,
      role: { in: eligibleRoles },
    },
    select: { voter_id: true },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  const targets = eligibleVoters.filter(
    (v) => !existingVoterIds.has(v.voter_id),
  );
  const skippedAlreadyHasToken = eligibleVoters.length - targets.length;

  // Generate token unik (retry jika tabrakan)
  const used = new Set<string>();
  const codes: string[] = [];
  for (let i = 0; i < targets.length; i++) {
    let code = generateTokenCode(orgCode);
    let guard = 0;
    while ((used.has(code) || (await isTokenTaken(code))) && guard < 10) {
      code = generateTokenCode(orgCode);
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
    skippedNoEligible: 0,
    skippedAlreadyHasToken,
    tokenCodes: codes,
  };
}

async function isTokenTaken(tokenCode: string): Promise<boolean> {
  const existing = await db.voteToken.findUnique({
    where: { token_code: tokenCode },
    select: { token_id: true },
  });
  return Boolean(existing);
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
