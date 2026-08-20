import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    election: {
      findUnique: vi.fn(),
    },
    voter: {
      findMany: vi.fn(),
    },
    voteToken: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ default: dbMock }));

import {
  generateTokenCode,
  generateTokensForElection,
  TOKEN_LENGTH,
} from "./tokens";

function resetMocks() {
  dbMock.election.findUnique.mockReset();
  dbMock.voter.findMany.mockReset();
  dbMock.voteToken.createMany.mockReset();
}

beforeEach(resetMocks);

describe("generateTokenCode", () => {
  it("menghasilkan 8 digit numerik", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateTokenCode();
      expect(code).toMatch(/^\d{8}$/);
      expect(code).toHaveLength(TOKEN_LENGTH);
    }
  });
});

describe("generateTokensForElection", () => {
  it("membuat token hanya untuk voter eligible yang belum punya token", async () => {
    dbMock.election.findUnique.mockResolvedValue({
      eligible_roles: ["SISWA", "OSIS"],
      tokens: [{ voter_id: "v-1" }], // v-1 sudah punya token
    });
    dbMock.voter.findMany.mockResolvedValue([
      { voter_id: "v-1" },
      { voter_id: "v-2" },
      { voter_id: "v-3" },
    ]);
    dbMock.voteToken.createMany.mockResolvedValue({ count: 2 });

    const result = await generateTokensForElection("e-1");

    expect(result.created).toBe(2);
    expect(result.skippedAlreadyHasToken).toBe(1);
    expect(dbMock.voteToken.createMany).toHaveBeenCalledOnce();
    const data = dbMock.voteToken.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data.map((d: { voter_id: string }) => d.voter_id)).toEqual([
      "v-2",
      "v-3",
    ]);
    expect(
      data.every((d: { token_code: string }) => /^\d{8}$/.test(d.token_code)),
    ).toBe(true);
    // token codes harus unik
    const codes = data.map((d: { token_code: string }) => d.token_code);
    expect(new Set(codes).size).toBe(2);
  });

  it("throw saat election tidak ditemukan", async () => {
    dbMock.election.findUnique.mockResolvedValue(null);
    await expect(generateTokensForElection("e-x")).rejects.toThrow(
      "ELECTION_NOT_FOUND",
    );
  });

  it("tidak memanggil createMany saat tidak ada target", async () => {
    dbMock.election.findUnique.mockResolvedValue({
      eligible_roles: ["SISWA"],
      tokens: [],
    });
    dbMock.voter.findMany.mockResolvedValue([]);

    const result = await generateTokensForElection("e-1");

    expect(result.created).toBe(0);
    expect(dbMock.voteToken.createMany).not.toHaveBeenCalled();
  });
});
