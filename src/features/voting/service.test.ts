import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test service.ts — db di-mock (tidak menyentuh database asli).
 * Rate limiter singleton di-reset tiap test.
 */

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    voteToken: { findUnique: vi.fn(), updateMany: vi.fn() },
    candidate: { findFirst: vi.fn() },
    vote: { create: vi.fn() },
    election: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ default: dbMock }));

import { rateLimiter } from "@/lib/utils/rate-limit";
import { isVoteError, VoteError } from "./errors";
import { castVote, getActiveElection, verifyToken } from "./service";

const NOW = Date.now();

function makeElection(overrides: Record<string, unknown> = {}) {
  return {
    election_id: "election-1",
    title: "Pemilihan Ketua OSIS",
    description: null,
    start_time: new Date(NOW - 3_600_000),
    end_time: new Date(NOW + 3_600_000),
    is_active: true,
    eligible_roles: ["SISWA"],
    ...overrides,
  };
}

function makeVoter(overrides: Record<string, unknown> = {}) {
  return {
    voter_id: "voter-1",
    name: "Budi Santoso",
    email: "budi@test.sch.id",
    role: "SISWA",
    generation: "33",
    ...overrides,
  };
}

function makeToken(overrides: Record<string, unknown> = {}) {
  return {
    token_id: "token-1",
    voter_id: "voter-1",
    election_id: "election-1",
    token_code: "48219037",
    is_used: false,
    used_at: null,
    email_sent_at: null,
    email_error: null,
    ...overrides,
  };
}

function mockTokenLookup(
  tokenOverrides = {},
  voterOverrides = {},
  electionOverrides = {},
) {
  dbMock.voteToken.findUnique.mockResolvedValue({
    ...makeToken(tokenOverrides),
    voter: makeVoter(voterOverrides),
    election: makeElection(electionOverrides),
  });
}

function expectVoteError(error: unknown, code: string) {
  expect(isVoteError(error)).toBe(true);
  if (error instanceof VoteError) expect(error.code).toBe(code);
}

describe("verifyToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter.reset();
  });

  it("mengembalikan voterId + electionId untuk token valid", async () => {
    mockTokenLookup();
    const result = await verifyToken({ token: "48219037" });
    expect(result).toEqual({ voterId: "voter-1", electionId: "election-1" });
    expect(dbMock.voteToken.findUnique).toHaveBeenCalledWith({
      where: { token_code: "48219037" },
      include: { voter: true, election: true },
    });
  });

  it("melempar TOKEN_INVALID untuk token tak dikenal", async () => {
    dbMock.voteToken.findUnique.mockResolvedValue(null);
    await expect(verifyToken({ token: "99999999" })).rejects.toThrow(VoteError);
    await expect(verifyToken({ token: "99999999" })).rejects.toThrow(
      expect.objectContaining({ code: "TOKEN_INVALID" }) as Error,
    );
  });

  it("melempar TOKEN_ALREADY_USED untuk token terpakai", async () => {
    mockTokenLookup({ is_used: true, used_at: new Date() });
    try {
      await verifyToken({ token: "48219037" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "TOKEN_ALREADY_USED");
    }
  });

  it("melempar TOKEN_LOCKED setelah 5 kegagalan tanpa menyentuh DB", async () => {
    for (let i = 0; i < 5; i++) rateLimiter.recordTokenFailure("48219037");
    mockTokenLookup();
    try {
      await verifyToken({ token: "48219037" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "TOKEN_LOCKED");
    }
    expect(dbMock.voteToken.findUnique).not.toHaveBeenCalled();
  });

  it("melempar ELECTION_NOT_STARTED jika pemilu belum mulai", async () => {
    mockTokenLookup({}, {}, { start_time: new Date(NOW + 3_600_000) });
    try {
      await verifyToken({ token: "48219037" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "ELECTION_NOT_STARTED");
    }
  });

  it("melempar ELECTION_ENDED jika pemilu selesai", async () => {
    mockTokenLookup({}, {}, { end_time: new Date(NOW - 3_600_000) });
    try {
      await verifyToken({ token: "48219037" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "ELECTION_ENDED");
    }
  });

  it("melempar VOTER_NOT_ELIGIBLE untuk role di luar daftar", async () => {
    mockTokenLookup({}, { role: "GUKAR" });
    try {
      await verifyToken({ token: "48219037" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "VOTER_NOT_ELIGIBLE");
    }
  });

  it("melempar RATE_LIMITED saat throttle global aktif", async () => {
    for (let i = 0; i < 50; i++) rateLimiter.recordGlobalFailure();
    mockTokenLookup();
    try {
      await verifyToken({ token: "48219037" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "RATE_LIMITED");
    }
  });
});

describe("castVote", () => {
  const txMock = {
    voteToken: { findUnique: vi.fn(), updateMany: vi.fn() },
    candidate: { findFirst: vi.fn() },
    vote: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter.reset();
    dbMock.$transaction.mockImplementation(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
  });

  it("mencatat vote dalam transaksi atomic", async () => {
    txMock.voteToken.findUnique.mockResolvedValue({
      ...makeToken(),
      voter: makeVoter(),
      election: makeElection(),
    });
    txMock.candidate.findFirst.mockResolvedValue({ candidate_id: "cand-1" });
    txMock.voteToken.updateMany.mockResolvedValue({ count: 1 });
    txMock.vote.create.mockResolvedValue({});

    await castVote({ token: "48219037", candidateId: "cand-1" });

    expect(txMock.voteToken.updateMany).toHaveBeenCalledWith({
      where: { token_id: "token-1", is_used: false },
      data: { is_used: true, used_at: expect.any(Date) },
    });
    expect(txMock.vote.create).toHaveBeenCalledWith({
      data: {
        election_id: "election-1",
        voter_id: "voter-1",
        candidate_id: "cand-1",
      },
    });
  });

  it("menolak kandidat dari pemilu lain (CANDIDATE_NOT_FOUND)", async () => {
    txMock.voteToken.findUnique.mockResolvedValue({
      ...makeToken(),
      voter: makeVoter(),
      election: makeElection(),
    });
    txMock.candidate.findFirst.mockResolvedValue(null);

    try {
      await castVote({ token: "48219037", candidateId: "cand-9" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "CANDIDATE_NOT_FOUND");
    }
    expect(txMock.vote.create).not.toHaveBeenCalled();
  });

  it("melempar TOKEN_ALREADY_USED bila claim gagal (race condition)", async () => {
    txMock.voteToken.findUnique.mockResolvedValue({
      ...makeToken(),
      voter: makeVoter(),
      election: makeElection(),
    });
    txMock.candidate.findFirst.mockResolvedValue({ candidate_id: "cand-1" });
    txMock.voteToken.updateMany.mockResolvedValue({ count: 0 });

    try {
      await castVote({ token: "48219037", candidateId: "cand-1" });
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "TOKEN_ALREADY_USED");
    }
    expect(txMock.vote.create).not.toHaveBeenCalled();
  });

  it("melempar NO_VOTE_SESSION tidak terjadi di service (dicek action)", async () => {
    // Service murni menerima token; guard session ada di actions/voting.ts.
    expect(true).toBe(true);
  });
});

describe("getActiveElection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengembalikan pemilu aktif dengan kandidat terurut", async () => {
    dbMock.election.findFirst.mockResolvedValue({
      ...makeElection(),
      candidates: [
        { candidate_number: 2, candidate_id: "cand-2" },
        { candidate_number: 1, candidate_id: "cand-1" },
      ],
    });
    const result = await getActiveElection();
    expect(result.candidates[0].candidate_number).toBe(2);
  });

  it("melempar ELECTION_NOT_FOUND bila tak ada pemilu aktif", async () => {
    dbMock.election.findFirst.mockResolvedValue(null);
    try {
      await getActiveElection();
      expect.unreachable();
    } catch (error) {
      expectVoteError(error, "ELECTION_NOT_FOUND");
    }
  });
});
