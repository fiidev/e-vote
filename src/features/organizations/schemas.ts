import { z } from "zod";
import type { AdminRole, OrgType } from "@/generated/prisma/enums";

export const orgTypeEnum = z.enum([
  "MAIN_ORGANIZATION",
  "SUB_ORGANIZATION",
]) as z.ZodType<OrgType>;
export const adminRoleEnum = z.enum([
  "SUPER_ADMIN",
  "ORG_ADMIN",
]) as z.ZodType<AdminRole>;

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

const isoDate = (field: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string" || !value.trim()) return undefined;
      const trimmed = value.trim();
      const normalized =
        trimmed.length === 10
          ? `${trimmed}T00:00:00`
          : trimmed.length === 16
            ? `${trimmed}:00`
            : trimmed;
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return undefined;
      return date;
    },
    z
      .date({
        message: `${field} wajib diisi dengan format tanggal yang valid`,
      })
      .optional(),
  );

export const organizationCreateSchema = z.object({
  name: requiredString("Nama organisasi"),
  slug: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim().toLowerCase().replace(/\s+/g, "-")
        : "",
    z
      .string()
      .min(2, "Slug minimal 2 karakter")
      .max(50, "Slug maksimal 50 karakter")
      .regex(
        /^[a-z0-9-]+$/,
        "Slug hanya boleh berisi huruf kecil, angka, dan strip",
      ),
  ),
  code: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
        : "",
    z
      .string()
      .min(2, "Kode prefix minimal 2 karakter")
      .max(6, "Kode prefix maksimal 6 karakter")
      .regex(/^[A-Z0-9]+$/, "Kode hanya boleh huruf kapital dan angka"),
  ),
  type: orgTypeEnum.default("SUB_ORGANIZATION"),
  parentId: optionalString(),
  logoUrl: optionalUrl("Logo URL"),
  description: optionalString(),
});

export const organizationUpdateSchema = organizationCreateSchema
  .partial()
  .extend({
    id: z.string().uuid("ID organisasi tidak valid"),
  });

export const adminProvisionSchema = z
  .object({
    name: requiredString("Nama penanggung jawab"),
    email: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
      z.string().email("Format email Google tidak valid"),
    ),
    role: adminRoleEnum.default("ORG_ADMIN"),
    organizationId: optionalString(),
    termStart: isoDate("Masa awal jabatan"),
    termEnd: isoDate("Masa akhir jabatan"),
  })
  .refine(
    (data) => {
      if (data.role === "ORG_ADMIN" && !data.organizationId) {
        return false;
      }
      return true;
    },
    {
      message: "Organisasi wajib dipilih untuk Org Admin",
      path: ["organizationId"],
    },
  )
  .refine(
    (data) => {
      if (data.termStart && data.termEnd) {
        return data.termStart < data.termEnd;
      }
      return true;
    },
    {
      message: "Masa akhir jabatan harus lebih lambat dari masa awal",
      path: ["termEnd"],
    },
  );

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
export type AdminProvisionInput = z.infer<typeof adminProvisionSchema>;
