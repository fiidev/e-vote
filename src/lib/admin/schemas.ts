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

/**
 * datetime-local HTML input mengirim "YYYY-MM-DDTHH:MM" (16 karakter, tanpa detik).
 * Prisma/PostgreSQL butuh DateTime object. Transform ke Date (interpretasi lokal).
 * Input "2026-08-21T04:13" → Date("2026-08-21T04:13:00").
 */
const isoDate = (field: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string" || !value.trim()) return undefined;
      const trimmed = value.trim();
      const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return undefined;
      return date;
    },
    z.date({
      message: `${field} wajib diisi dengan format tanggal yang valid`,
    }),
  );

const booleanFromForm = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string")
    return value === "on" || value === "true" || value === "1";
  return false;
}, z.boolean());

const optionalUrl = (field: string) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : undefined,
    z
      .string()
      .url(`${field} harus berupa format URL yang valid (cth: https://...)`)
      .optional(),
  );

export const electionBaseSchema = z.object({
  title: requiredString("Judul"),
  description: optionalString(),
  start_time: isoDate("Waktu mulai"),
  end_time: isoDate("Waktu selesai"),
  is_active: booleanFromForm,
  is_weighted: booleanFromForm,
  eligible_roles: z.preprocess(
    (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string")
        return value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
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

export const electionCreateSchema = electionBaseSchema.refine(
  (data) => data.start_time < data.end_time,
  {
    message: "Waktu selesai harus lebih lambat dari waktu mulai",
    path: ["end_time"],
  },
);

export const electionUpdateSchema = electionBaseSchema
  .partial()
  .extend({
    election_id: z.string().uuid("ID pemilihan tidak valid"),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.start_time < data.end_time;
      }
      return true;
    },
    {
      message: "Waktu selesai harus lebih lambat dari waktu mulai",
      path: ["end_time"],
    },
  );

const preprocessNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return undefined;
};

export const candidateCreateSchema = z.object({
  election_id: z.string().uuid("Pilihan pemilihan wajib dipilih"),
  candidate_number: z.preprocess(
    preprocessNumber,
    z
      .number({
        message: "Nomor urut wajib diisi dengan angka",
      })
      .int("Nomor urut harus berupa bilangan bulat")
      .min(1, "Nomor urut minimal 1"),
  ),
  name: requiredString("Nama kandidat"),
  class_name: requiredString("Kelas"),
  photo_url: optionalUrl("URL Foto"),
  vision: requiredString("Visi"),
  mission: requiredString("Misi"),
});

export const candidateUpdateSchema = z.object({
  candidate_id: z.string().uuid("ID kandidat tidak valid"),
  election_id: z.string().uuid("Pilihan pemilihan wajib dipilih").optional(),
  candidate_number: z.preprocess(
    preprocessNumber,
    z
      .number({
        message: "Nomor urut harus berupa angka",
      })
      .int("Nomor urut harus berupa bilangan bulat")
      .min(1, "Nomor urut minimal 1")
      .optional(),
  ),
  name: requiredString("Nama kandidat").optional(),
  class_name: requiredString("Kelas").optional(),
  photo_url: optionalUrl("URL Foto"),
  vision: requiredString("Visi").optional(),
  mission: requiredString("Misi").optional(),
});

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

export type ElectionCreateInput = z.infer<typeof electionCreateSchema>;
export type ElectionUpdateInput = z.infer<typeof electionUpdateSchema>;
export type CandidateCreateInput = z.infer<typeof candidateCreateSchema>;
export type CandidateUpdateInput = z.infer<typeof candidateUpdateSchema>;
export type VoterCreateInput = z.infer<typeof voterCreateSchema>;
export type VoterUpdateInput = z.infer<typeof voterUpdateSchema>;
export type VoterEmailUpdateInput = z.infer<typeof voterEmailUpdateSchema>;
