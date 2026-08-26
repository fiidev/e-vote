import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

const ROLE_VALUES = Object.values(Role) as [string, ...string[]];
export const roleEnum = z.enum(ROLE_VALUES);

const optionalString = () =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : undefined,
    z.string().optional(),
  );

const requiredString = (field: string, min = 1) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(min, `${field} wajib diisi`),
  );

export const voterCreateSchema = z.object({
  name: requiredString("Nama"),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
    z.string().email("Format email tidak valid"),
  ),
  role: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().toUpperCase() : "SISWA",
    roleEnum,
  ),
  generation: optionalString(),
});

export const voterUpdateSchema = voterCreateSchema.partial().extend({
  voter_id: z.string().uuid("ID pemilih tidak valid"),
});

export const voterEmailUpdateSchema = z.object({
  voter_id: z.string().uuid("ID pemilih tidak valid"),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
    z.string().email("Format email tidak valid"),
  ),
});

export type VoterCreateInput = z.infer<typeof voterCreateSchema>;
export type VoterUpdateInput = z.infer<typeof voterUpdateSchema>;
export type VoterEmailUpdateInput = z.infer<typeof voterEmailUpdateSchema>;
