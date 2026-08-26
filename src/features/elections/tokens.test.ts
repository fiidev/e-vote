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
      findUnique: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ default: dbMock }));

import { generateTokenCode, generateTokensForElection } from "./tokens";

function resetMocks() {
  dbMock.election.findUnique.mockReset();
  dbMock.voter.findMany.mockReset();
  dbMock.voteToken.findUnique.mockReset();
  dbMock.voteToken.createMany.mockReset();
}

beforeEach(resetMocks);

describe("generateTokenCode", () => {
  it("menghasilkan format [PREFIX]-[BLOCK1]-[BLOCK2] dengan Crockford Base32", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateTokenCode("MTC");
      expect(code).toMatch(/^MTC-[2-9A-HJ-KM-NP-Z]{4}-[2-9A-HJ-KM-NP-Z]{4}$/);
    }
  });
});

describe("generateTokensForElection", () => {
  it("membuat token hanya untuk voter eligible yang belum punya token", async () => {
    dbMock.election.findUnique.mockResolvedValue({
      eligible_roles: ["SISWA"],
      organization: { code: "MTC" },
      tokens: [{ voter_id: "v-1" }],
    });
    dbMock.voter.findMany.mockResolvedValue([
      { voter_id: "v-2" },
      { voter_id: "v-3" },
    ]);
    dbMock.voteToken.findUnique.mockResolvedValue(null);
    dbMock.voteToken.createMany.mockResolvedValue({ count: 2 });

    const result = await generateTokensForElection("e-1");

    expect(result.created).toBe(2);
    expect(result.skippedAlreadyHasToken).toBe(0);
    expect(dbMock.voteToken.createMany).toHaveBeenCalledOnce();
    const data = dbMock.voteToken.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data.map((d: { voter_id: string }) => d.voter_id)).toEqual([
      "v-2",
      "v-3",
    ]);
    expect(
      data.every((d: { token_code: string }) =>
        /^MTC-[2-9A-HJ-KM-NP-Z]{4}-[2-9A-HJ-KM-NP-Z]{4}$/.test(d.token_code),
      ),
    ).toBe(true);
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
      organization: { code: "MTC" },
      tokens: [],
    });
    dbMock.voter.findMany.mockResolvedValue([]);

    const result = await generateTokensForElection("e-1");

    expect(result.created).toBe(0);
    expect(dbMock.voteToken.createMany).not.toHaveBeenCalled();
  });
});
