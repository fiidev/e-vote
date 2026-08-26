import { z } from "zod";

/**
 * Validasi input voting.
 *
 * Token: terima "48219037" atau "4821-9037" (atau dengan spasi),
 * selalu dinormalisasi menjadi 8 digit murni pada output.
 */

export const verifyTokenSchema = z.object({
  token: z.preprocess(
    (value) => {
      if (typeof value !== "string") return "";
      const clean = value.trim().toUpperCase().replace(/\s+/g, "");
      // Jika input tanpa strip (misal "MTCK7X92P4W" dengan prefix 3 huruf + 8 chars = 11 chars)
      if (!clean.includes("-") && clean.length >= 10 && clean.length <= 14) {
        const codeLen = clean.length - 8;
        const prefix = clean.slice(0, codeLen);
        const b1 = clean.slice(codeLen, codeLen + 4);
        const b2 = clean.slice(codeLen + 4);
        return `${prefix}-${b1}-${b2}`;
      }
      return clean;
    },
    z.string().min(8, "Token tidak valid").max(18, "Token tidak valid"),
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
