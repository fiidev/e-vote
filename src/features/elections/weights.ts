import type { Role } from "@/generated/prisma/enums";

/**
 * Weighted voting (Opsi B) — bobot per role harus total 100%.
 * Formula perhitungan suara:
 *   skor_kandidat = Σ_grup ( (vote_grup / total_grup) × bobot_grup ) × 100
 * Di mana vote_grup = jumlah suara kandidat dari grup role tsb,
 * dan total_grup = total pemilih eligible di grup role tsb.
 */

export const WEIGHT_ERRORS = {
  NOT_WEIGHTED: "Pemilihan tidak menggunakan sistem bobot.",
  TOTAL_NOT_100: "Total bobot role harus tepat 100%.",
  ROLE_MISSING: "Semua role yang eligible harus memiliki bobot.",
  EMPTY: "Bobot role tidak boleh kosong.",
} as const;

export type WeightMap = Record<string, number>;

/** Validasi bobot: semua eligible role ada & totalnya 100. */
export function validateWeights(
  weights: WeightMap | null | undefined,
  eligibleRoles: Role[] | string[],
): string | null {
  if (!weights || Object.keys(weights).length === 0) {
    return WEIGHT_ERRORS.EMPTY;
  }
  for (const role of eligibleRoles) {
    if (typeof weights[role] !== "number" || Number.isNaN(weights[role])) {
      return WEIGHT_ERRORS.ROLE_MISSING;
    }
  }
  const total = Object.values(weights).reduce((acc, w) => acc + (w ?? 0), 0);
  if (Math.abs(total - 100) > 0.0001) {
    return WEIGHT_ERRORS.TOTAL_NOT_100;
  }
  return null;
}

export interface WeightedGroupStats {
  role: string;
  votesForCandidate: number;
  totalEligible: number;
}

/**
 * Hitung skor weighted untuk satu kandidat.
 * skor = Σ ( (votesForCandidate / totalEligible) × weight ) × 100
 * Mengembalikan null jika totalEligible 0 (hindari NaN).
 */
export function computeWeightedScore(
  groups: WeightedGroupStats[],
  weights: WeightMap,
): number | null {
  if (groups.length === 0) return null;
  let score = 0;
  for (const g of groups) {
    const weight = weights[g.role] ?? 0;
    if (g.totalEligible === 0) continue;
    score += (g.votesForCandidate / g.totalEligible) * weight;
  }
  return Math.round(score * 10000) / 10000; // presisi 4 desimal
}

/** Hitung persentase suara biasa (Opsi A): votes / totalVotes * 100. */
export function computeSimplePercentage(
  votes: number,
  totalVotes: number,
): number {
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 1000) / 10; // 1 desimal
}
