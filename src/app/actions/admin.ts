"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  candidateCreateSchema,
  candidateUpdateSchema,
  electionCreateSchema,
  electionUpdateSchema,
  voterCreateSchema,
  voterEmailUpdateSchema,
  voterUpdateSchema,
} from "@/lib/admin/schemas";
import {
  createCandidate,
  createElection,
  createVoter,
  deleteCandidate,
  deleteElection,
  deleteVoter,
  updateCandidate,
  updateElection,
  updateVoter,
  updateVoterEmail,
} from "@/lib/admin/service";
import { generateTokensForElection } from "@/lib/admin/tokens";
import { validateWeights } from "@/lib/admin/weights";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";
import { sendTokenEmails } from "@/lib/email/service";
import { parseVoterImport } from "@/lib/excel/service";
import type { ActionState } from "@/types/admin";

// ─── Auth guard ───────────────────────────────────────────────────────────

async function requireAdmin(): Promise<void> {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
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

// ─── Elections ────────────────────────────────────────────────────────────

export async function createElectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
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

  await createElection(data);
  revalidatePath("/admin/elections");
  return { ok: true, message: "Pemilihan berhasil dibuat." };
}

export async function updateElectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
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

  await updateElection(data);
  revalidatePath("/admin/elections");
  return { ok: true, message: "Pemilihan berhasil diperbarui." };
}

export async function deleteElectionAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const electionId = formData.get("election_id");
  if (typeof electionId !== "string")
    return { ok: false, errors: { _form: ["ID tidak valid."] } };
  await deleteElection(electionId);
  revalidatePath("/admin/elections");
  return { ok: true, message: "Pemilihan berhasil dihapus." };
}

// ─── Candidates ───────────────────────────────────────────────────────────

export async function createCandidateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = parseForm(candidateCreateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  await createCandidate(result.data);
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/elections");
  return { ok: true, message: "Kandidat berhasil ditambahkan." };
}

export async function updateCandidateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = parseForm(candidateUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  await updateCandidate(result.data);
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/elections");
  return { ok: true, message: "Kandidat berhasil diperbarui." };
}

export async function deleteCandidateAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const candidateId = formData.get("candidate_id");
  if (typeof candidateId !== "string")
    return { ok: false, errors: { _form: ["ID tidak valid."] } };
  await deleteCandidate(candidateId);
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/elections");
  return { ok: true, message: "Kandidat berhasil dihapus." };
}

// ─── Voters ───────────────────────────────────────────────────────────────

export async function createVoterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = parseForm(voterCreateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await createVoter(result.data);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, errors: { email: ["Email sudah terdaftar."] } };
    }
    throw err;
  }
  revalidatePath("/admin/voters");
  return { ok: true, message: "Pemilih berhasil ditambahkan." };
}

export async function updateVoterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = parseForm(voterUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  await updateVoter(result.data);
  revalidatePath("/admin/voters");
  return { ok: true, message: "Data pemilih berhasil diperbarui." };
}

export async function deleteVoterAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const voterId = formData.get("voter_id");
  if (typeof voterId !== "string")
    return { ok: false, errors: { _form: ["ID tidak valid."] } };
  await deleteVoter(voterId);
  revalidatePath("/admin/voters");
  return { ok: true, message: "Pemilih berhasil dihapus." };
}

export async function updateVoterEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = parseForm(voterEmailUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  await updateVoterEmail(result.data.voter_id, result.data.email);
  revalidatePath("/admin/voters");
  return {
    ok: true,
    message: "Email diperbarui. Kirim ulang token untuk email baru.",
  };
}

// ─── Token generation & email ─────────────────────────────────────────────

export async function generateTokensAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
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
    throw err;
  }
}

export async function sendTokensEmailAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const electionId = formData.get("election_id");
  if (typeof electionId !== "string" || !electionId) {
    return { ok: false, errors: { _form: ["ID pemilihan tidak valid."] } };
  }

  // Ambil token yang belum terkirim (email_sent_at null) untuk election tsb
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
}

export async function resendTokenEmailAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const tokenId = formData.get("token_id");
  if (typeof tokenId !== "string" || !tokenId) return;

  const token = await db.voteToken.findUnique({
    where: { token_id: tokenId },
    include: {
      voter: { select: { voter_id: true, name: true, email: true } },
      election: { select: { title: true } },
    },
  });
  if (!token) return;

  await sendTokenEmails([
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
}

// ─── Excel import (SATU transaksi + rollback) ─────────────────────────────

export async function importVotersAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
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

  // Transaksi: buat semua voter → rollback total kalau ada error.
  // Gunakan createMany (bukan create per-row) agar tidak timeout untuk file besar.
  try {
    await db.$transaction(
      async (tx) => {
        await tx.voter.createMany({
          data: parsed.rows.map((row) => ({
            name: row.name,
            email: row.email,
            role: row.role,
            generation: row.generation ?? null,
          })),
          skipDuplicates: true,
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
            "Ada email yang sudah terdaftar — tidak ada data yang diimpor (rollback).",
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function isUniqueViolation(err: unknown): boolean {
  if (err instanceof Error && "code" in err) {
    const code = (err as { code?: string }).code;
    return code === "P2002" || code === "23505";
  }
  return false;
}
