"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  electionCreateSchema,
  electionUpdateSchema,
} from "@/features/elections/schemas";
import {
  createElection,
  deleteElection,
  updateElection,
} from "@/features/elections/service";
import { generateTokensForElection } from "@/features/elections/tokens";
import { validateWeights } from "@/features/elections/weights";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";
import { sendTokenEmails } from "@/lib/email/service";
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

export async function createElectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const result = parseForm(electionCreateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  const { data } = result;
  if (data.is_weighted) {
    const weightError = validateWeights(
      data.role_weights ?? null,
      data.eligible_roles,
    );
    if (weightError) {
      return { ok: false, errors: { role_weights: [weightError] } };
    }
  }

  const organizationId =
    user.role === "SUPER_ADMIN"
      ? (formData.get("organizationId") as string) || user.organizationId
      : user.organizationId;

  if (!organizationId) {
    return {
      ok: false,
      errors: { _form: ["Akun Anda belum terhubung ke organisasi manapun."] },
    };
  }

  await createElection(data, organizationId);
  revalidatePath("/admin/elections");
  return { ok: true, message: "Pemilihan berhasil dibuat." };
}

export async function updateElectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const result = parseForm(electionUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  const { data } = result;
  if (data.is_weighted && data.eligible_roles) {
    const weightError = validateWeights(
      data.role_weights ?? null,
      data.eligible_roles,
    );
    if (weightError) {
      return { ok: false, errors: { role_weights: [weightError] } };
    }
  }

  await updateElection(
    data,
    user.role === "SUPER_ADMIN" ? null : user.organizationId,
  );
  revalidatePath("/admin/elections");
  return { ok: true, message: "Pemilihan berhasil diperbarui." };
}

export async function deleteElectionAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const electionId = formData.get("election_id");
  if (typeof electionId !== "string" || !electionId)
    return { ok: false, errors: { _form: ["ID tidak valid."] } };
  try {
    await deleteElection(
      electionId,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
    revalidatePath("/admin/elections");
    return { ok: true, message: "Pemilihan berhasil dihapus." };
  } catch (err) {
    if (err instanceof Error && err.message === "ELECTION_HAS_VOTES") {
      return {
        ok: false,
        errors: {
          _form: [
            "Pemilihan tidak dapat dihapus karena sudah memiliki suara masuk atau token yang terpakai.",
          ],
        },
      };
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal menghapus pemilihan. Terjadi kesalahan server."],
      },
    };
  }
}

export async function generateTokensAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  const electionId = formData.get("election_id");
  if (typeof electionId !== "string" || !electionId) {
    return { ok: false, errors: { _form: ["ID pemilihan tidak valid."] } };
  }

  try {
    const result = await generateTokensForElection(electionId);
    revalidatePath("/admin/elections");
    revalidatePath("/admin/voters");
    if (result.created === 0) {
      return {
        ok: true,
        message: `Tidak ada token baru yang dibuat. ${result.skippedAlreadyHasToken} pemilih sudah memiliki token. Pastikan pemilih dengan role yang sesuai sudah ditambahkan.`,
      };
    }
    return {
      ok: true,
      message: `${result.created} token berhasil dibuat untuk pemilihan ini.`,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "ELECTION_NOT_FOUND") {
      return { ok: false, errors: { _form: ["Pemilihan tidak ditemukan."] } };
    }
    return {
      ok: false,
      errors: { _form: ["Gagal membuat token. Terjadi kesalahan server."] },
    };
  }
}

export async function sendTokensEmailAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  const electionId = formData.get("election_id");
  if (typeof electionId !== "string" || !electionId) {
    return { ok: false, errors: { _form: ["ID pemilihan tidak valid."] } };
  }

  try {
    const pending = await db.voteToken.findMany({
      where: { election_id: electionId, email_sent_at: null },
      include: {
        voter: { select: { voter_id: true, name: true, email: true } },
        election: { select: { title: true } },
      },
    });

    if (pending.length === 0) {
      return {
        ok: true,
        message:
          "Tidak ada token yang perlu dikirim. Semua token sudah terkirim atau belum dibuat.",
      };
    }

    const items = pending.map((t) => ({
      voter_id: t.voter.voter_id,
      voter_name: t.voter.name,
      voter_email: t.voter.email,
      token_id: t.token_id,
      token_code: t.token_code,
      election_title: t.election.title,
    }));

    const result = await sendTokenEmails(items);
    revalidatePath("/admin/elections");
    revalidatePath("/admin/voters");

    const parts: string[] = [];
    if (result.sent > 0) parts.push(`${result.sent} terkirim`);
    if (result.failed > 0) parts.push(`${result.failed} gagal`);
    if (result.noEmail > 0) parts.push(`${result.noEmail} tanpa email`);
    if (result.skippedDueToCap > 0)
      parts.push(`${result.skippedDueToCap} ditunda (kuota)`);

    return {
      ok: result.failed === 0,
      message:
        parts.length > 0
          ? `Email: ${parts.join(", ")}.`
          : "Email selesai diproses.",
    };
  } catch (_err) {
    return {
      ok: false,
      errors: {
        _form: ["Gagal mengirim email token. Terjadi kesalahan server."],
      },
    };
  }
}
