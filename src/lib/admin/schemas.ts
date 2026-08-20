import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

/**
 * Zod schemas untuk input admin (CRUD + weights + import).
 * Pattern zod v4 sama seperti lib/vote/schemas.ts: preprocess untuk
 * nilai dari FormData (string | null), lalu validasi ketat.
 */

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

const isoDate = (field: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value : undefined),
    z
      .string()
      .datetime({ offset: true })
      .or(z.string().min(1, `${field} wajib diisi`)),
  );

const booleanFromForm = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string")
    return value === "on" || value === "true" || value === "1";
  return false;
}, z.boolean());

export const electionCreateSchema = z.object({
  title: requiredString("Judul"),
  description: optionalString(),
  start_time: isoDate("Waktu mulai"),
  end_time: isoDate("Waktu selesai"),
  is_active: booleanFromForm,
  is_weighted: booleanFromForm,
  eligible_roles: z.preprocess(
    (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return value.split(",");
      return [];
    },
    z.array(roleEnum).min(1, "Pilih minimal satu role yang berhak memilih"),
  ),
  role_weights: z.preprocess((value) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    }
    return value;
  }, z.record(roleEnum, z.number().min(0).max(100)).optional()),
});

export const electionUpdateSchema = electionCreateSchema.partial().extend({
  election_id: z.string().uuid(),
});

export const candidateCreateSchema = z.object({
  election_id: z.string().uuid(),
  candidate_number: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().int().min(1, "Nomor urut minimal 1"),
  ),
  name: requiredString("Nama kandidat"),
  class_name: requiredString("Kelas"),
  photo_url: optionalString(),
  vision: requiredString("Visi"),
  mission: requiredString("Misi"),
});

export const candidateUpdateSchema = candidateCreateSchema.partial().extend({
  candidate_id: z.string().uuid(),
});

export const voterCreateSchema = z.object({
  name: requiredString("Nama"),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
    z.string().email("Email tidak valid"),
  ),
  role: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().toUpperCase() : "SISWA",
    roleEnum,
  ),
  generation: optionalString(),
});

export const voterUpdateSchema = voterCreateSchema.partial().extend({
  voter_id: z.string().uuid(),
});

export const voterEmailUpdateSchema = z.object({
  voter_id: z.string().uuid(),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
    z.string().email("Email tidak valid"),
  ),
});

export type ElectionCreateInput = z.output<typeof electionCreateSchema>;
export type ElectionUpdateInput = z.output<typeof electionUpdateSchema>;
export type CandidateCreateInput = z.output<typeof candidateCreateSchema>;
export type CandidateUpdateInput = z.output<typeof candidateUpdateSchema>;
export type VoterCreateInput = z.output<typeof voterCreateSchema>;
export type VoterUpdateInput = z.output<typeof voterUpdateSchema>;
export type VoterEmailUpdateInput = z.output<typeof voterEmailUpdateSchema>;
