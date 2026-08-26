import { z } from "zod";

/**
 * Validasi input voting.
 *
 * Token: terima "48219037" atau "4821-9037" (atau dengan spasi),
 * selalu dinormalisasi menjadi 8 digit murni pada output.
 */

export const verifyTokenSchema = z.object({
  token: z.preprocess(
    (value) => (typeof value === "string" ? value.replace(/[\s-]/g, "") : ""),
    z.string().regex(/^\d{8}$/, "Token harus 8 digit (contoh: 4821-9037)"),
  ),
});

export const castVoteSchema = z.object({
  candidateId: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z.string().uuid("Kandidat tidak valid"),
  ),
});

export type VerifyTokenInput = z.input<typeof verifyTokenSchema>;
export type VerifyTokenOutput = z.output<typeof verifyTokenSchema>;
export type CastVoteInput = z.input<typeof castVoteSchema>;
export type CastVoteOutput = z.output<typeof castVoteSchema>;
