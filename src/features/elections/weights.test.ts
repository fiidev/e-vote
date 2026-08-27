import { describe, expect, it } from "vitest";
import {
  computeSimplePercentage,
  computeWeightedScore,
  validateWeights,
  WEIGHT_ERRORS,
} from "./weights";

describe("validateWeights", () => {
  it("valid saat semua role eligible punya bobot & total 100", () => {
    const error = validateWeights({ SISWA: 70, GUKAR: 20, UMUM: 10 }, [
      "SISWA",
      "GUKAR",
      "UMUM",
    ]);
    expect(error).toBeNull();
  });

  it("tolak saat total tidak 100", () => {
    expect(validateWeights({ SISWA: 50, GUKAR: 20 }, ["SISWA", "GUKAR"])).toBe(
      WEIGHT_ERRORS.TOTAL_NOT_100,
    );
  });

  it("tolak saat role eligible tidak punya bobot", () => {
    expect(
      validateWeights({ SISWA: 80, GUKAR: 20 }, ["SISWA", "GUKAR", "UMUM"]),
    ).toBe(WEIGHT_ERRORS.ROLE_MISSING);
  });

  it("tolak saat kosong/null", () => {
    expect(validateWeights(null, ["SISWA"])).toBe(WEIGHT_ERRORS.EMPTY);
    expect(validateWeights({}, ["SISWA"])).toBe(WEIGHT_ERRORS.EMPTY);
  });

  it("toleransi floating point 100.0000001 tetap valid", () => {
    expect(
      validateWeights(
        { SISWA: 33.3333334, GUKAR: 33.3333333, UMUM: 33.3333333 },
        ["SISWA", "GUKAR", "UMUM"],
      ),
    ).toBeNull();
  });
});

describe("computeWeightedScore", () => {
  it("hitung skor sesuai formula Opsi B", () => {
    // 100 SISWA: 60 vote kandidat; 30 GUKAR: 20 vote; bobot 70/30
    const score = computeWeightedScore(
      [
        { role: "SISWA", votesForCandidate: 60, totalEligible: 100 },
        { role: "GUKAR", votesForCandidate: 20, totalEligible: 30 },
      ],
      { SISWA: 70, GUKAR: 30 },
    );
    // (60/100)*70 + (20/30)*30 = 42 + 20 = 62
    expect(score).toBe(62);
  });

  it("return null saat tidak ada grup", () => {
    expect(computeWeightedScore([], { SISWA: 100 })).toBeNull();
  });

  it("skip grup dengan totalEligible 0 (hindari NaN)", () => {
    const score = computeWeightedScore(
      [
        { role: "SISWA", votesForCandidate: 10, totalEligible: 50 },
        { role: "GUKAR", votesForCandidate: 0, totalEligible: 0 },
      ],
      { SISWA: 80, GUKAR: 20 },
    );
    expect(score).toBe(16);
  });
});

describe("computeSimplePercentage", () => {
  it("hitung persentase 1 desimal", () => {
    expect(computeSimplePercentage(3, 7)).toBe(42.9);
    expect(computeSimplePercentage(7, 7)).toBe(100);
  });

  it("return 0 saat total 0", () => {
    expect(computeSimplePercentage(0, 0)).toBe(0);
  });
});
