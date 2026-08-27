"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  voterCreateSchema,
  voterEmailUpdateSchema,
  voterUpdateSchema,
} from "@/features/voters/schemas";
import {
  createVoter,
  deleteVoter,
  updateVoter,
  updateVoterEmail,
} from "@/features/voters/service";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";
import { sendTokenEmails } from "@/lib/email/service";
import { parseVoterImport } from "@/lib/excel/service";
import type { ActionState } from "@/types/action-state";

async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const flat = z.flattenError(error);
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(
    flat.fieldErrors as Record<string, string[] | undefined>,
  )) {
    if (value) result[key] = value;
  }
  const formErrors = flat.formErrors;
  if (typeof formErrors === "string") {
    result._form = [formErrors];
  } else if (Array.isArray(formErrors) && formErrors.length > 0) {
    result._form = formErrors;
  }
  return result;
}

function parseForm<S extends z.ZodTypeAny>(
  schema: S,
  formData: FormData,
):
  | { ok: true; data: z.output<S> }
  | { ok: false; errors: Record<string, string[]> } {
  const obj: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (obj[key] !== undefined) {
      const prev = obj[key];
      obj[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      obj[key] = value;
    }
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  return { ok: true, data: parsed.data as z.output<S> };
}

function isUniqueViolation(err: unknown): boolean {
  if (err instanceof Error && "code" in err) {
    const code = (err as { code?: string }).code;
    return code === "P2002" || code === "23505";
  }
  return false;
}

export async function createVoterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const result = parseForm(voterCreateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await createVoter(
      result.data,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        errors: { email: ["Email sudah terdaftar dalam pemilihan ini."] },
      };
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal menambahkan pemilih. Terjadi kesalahan server."],
      },
    };
  }
  revalidatePath("/admin/voters");
  return { ok: true, message: "Pemilih berhasil ditambahkan." };
}

export async function updateVoterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const result = parseForm(voterUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await updateVoter(
      result.data,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        errors: { email: ["Email sudah digunakan oleh pemilih lain."] },
      };
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal memperbarui pemilih. Terjadi kesalahan server."],
      },
    };
  }
  revalidatePath("/admin/voters");
  return { ok: true, message: "Data pemilih berhasil diperbarui." };
}

export async function deleteVoterAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const voterId = formData.get("voter_id");
  if (typeof voterId !== "string" || !voterId)
    return { ok: false, errors: { _form: ["ID tidak valid."] } };
  try {
    await deleteVoter(
      voterId,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
    revalidatePath("/admin/voters");
    return { ok: true, message: "Pemilih berhasil dihapus." };
  } catch (err) {
    if (err instanceof Error && err.message === "VOTER_HAS_VOTED") {
      return {
        ok: false,
        errors: {
          _form: [
            "Pemilih tidak dapat dihapus karena sudah menggunakan hak suaranya dalam pemilihan.",
          ],
        },
      };
    }
    return {
      ok: false,
      errors: { _form: ["Gagal menghapus pemilih. Terjadi kesalahan server."] },
    };
  }
}

export async function updateVoterEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const result = parseForm(voterEmailUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await updateVoterEmail(
      result.data.voter_id,
      result.data.email,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, errors: { email: ["Email sudah terdaftar."] } };
    }
    return {
      ok: false,
      errors: { _form: ["Gagal memperbarui email. Terjadi kesalahan server."] },
    };
  }
  revalidatePath("/admin/voters");
  return {
    ok: true,
    message: "Email diperbarui. Kirim ulang token untuk email baru.",
  };
}

export async function resendTokenEmailAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const tokenId = formData.get("token_id");
  if (typeof tokenId !== "string" || !tokenId) {
    return { ok: false, errors: { _form: ["ID token tidak valid."] } };
  }

  try {
    const token = await db.voteToken.findFirst({
      where: {
        token_id: tokenId,
        ...(user.role !== "SUPER_ADMIN" && user.organizationId
          ? { election: { organizationId: user.organizationId } }
          : {}),
      },
      include: {
        voter: { select: { voter_id: true, name: true, email: true } },
        election: { select: { title: true } },
      },
    });
    if (!token) {
      return { ok: false, errors: { _form: ["Token tidak ditemukan."] } };
    }

    const result = await sendTokenEmails([
      {
        voter_id: token.voter.voter_id,
        voter_name: token.voter.name,
        voter_email: token.voter.email,
        token_id: token.token_id,
        token_code: token.token_code,
        election_title: token.election.title,
        resend: true,
      },
    ]);
    revalidatePath("/admin/voters");
    if (result.sent > 0) {
      return {
        ok: true,
        message: `Email token berhasil dikirim ulang ke ${token.voter.email}.`,
      };
    }
    return {
      ok: false,
      errors: {
        _form: [
          result.failed > 0
            ? "Gagal mengirim email token. Periksa konfigurasi email."
            : "Email token ditunda karena batas kuota.",
        ],
      },
    };
  } catch (_err) {
    return {
      ok: false,
      errors: {
        _form: ["Gagal mengirim ulang email. Terjadi kesalahan server."],
      },
    };
  }
}

export async function importVotersAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const electionId = formData.get("election_id");
  if (typeof electionId !== "string" || !electionId) {
    return {
      ok: false,
      errors: { file: ["Pilih sesi pemilihan terlebih dahulu."] },
    };
  }

  // Verifikasi pemilihan milik org
  if (user.role !== "SUPER_ADMIN" && user.organizationId) {
    const election = await db.election.findFirst({
      where: { election_id: electionId, organizationId: user.organizationId },
    });
    if (!election) {
      return {
        ok: false,
        errors: { file: ["Sesi pemilihan tidak ditemukan."] },
      };
    }
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, errors: { file: ["File excel wajib diunggah."] } };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseVoterImport(buffer);
  if (!parsed.ok) {
    const first = parsed.errors[0];
    return {
      ok: false,
      errors: {
        file: [
          `${first?.message ?? "File tidak valid."} (${parsed.errors.length} baris bermasalah)`,
        ],
      },
    };
  }

  try {
    await db.$transaction(
      async (tx) => {
        await tx.voter.createMany({
          data: parsed.rows.map((row) => ({
            election_id: electionId,
            name: row.name,
            email: row.email,
            role: row.role,
            generation: row.generation ?? null,
          })),
        });
      },
      { timeout: 60000 },
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        errors: {
          file: [
            "Ada email yang sudah terdaftar dalam pemilihan ini — tidak ada data yang diimpor (rollback).",
          ],
        },
      };
    }
    throw err;
  }

  revalidatePath("/admin/voters");
  return {
    ok: true,
    message: `${parsed.rows.length} pemilih berhasil diimpor.`,
  };
}
