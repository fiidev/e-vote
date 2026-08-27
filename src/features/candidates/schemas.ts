import { z } from "zod";

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

export type CandidateCreateInput = z.infer<typeof candidateCreateSchema>;
export type CandidateUpdateInput = z.infer<typeof candidateUpdateSchema>;
