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

export type ElectionCreateInput = z.infer<typeof electionCreateSchema>;
export type ElectionUpdateInput = z.infer<typeof electionUpdateSchema>;
