"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  candidateCreateSchema,
  candidateUpdateSchema,
} from "@/features/candidates/schemas";
import {
  createCandidate,
  deleteCandidate,
  updateCandidate,
} from "@/features/candidates/service";
import { getAuthUser } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
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

export async function createCandidateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();

  const photoFile = formData.get("photo_file");
  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      const uploadedUrl = await uploadImageToCloudinary(photoFile);
      formData.set("photo_url", uploadedUrl);
    } catch {
      return {
        ok: false,
        errors: {
          photo_url: [
            "Gagal mengunggah foto ke Cloudinary. Silakan coba lagi.",
          ],
        },
      };
    }
  }

  const result = parseForm(candidateCreateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await createCandidate(
      result.data,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
    revalidatePath("/admin/candidates");
    revalidatePath("/admin/elections");
    return { ok: true, message: "Kandidat berhasil ditambahkan." };
  } catch (err) {
    if (
      (err instanceof Error && err.message === "CANDIDATE_NUMBER_EXISTS") ||
      isUniqueViolation(err)
    ) {
      return {
        ok: false,
        errors: {
          candidate_number: [
            "Nomor urut ini sudah digunakan oleh kandidat lain dalam pemilihan yang sama.",
          ],
        },
      };
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal menambahkan kandidat. Terjadi kesalahan server."],
      },
    };
  }
}

export async function updateCandidateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();

  const photoFile = formData.get("photo_file");
  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      const uploadedUrl = await uploadImageToCloudinary(photoFile);
      formData.set("photo_url", uploadedUrl);
    } catch {
      return {
        ok: false,
        errors: {
          photo_url: [
            "Gagal mengunggah foto ke Cloudinary. Silakan coba lagi.",
          ],
        },
      };
    }
  }

  const result = parseForm(candidateUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await updateCandidate(
      result.data,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
    revalidatePath("/admin/candidates");
    revalidatePath("/admin/elections");
    return { ok: true, message: "Kandidat berhasil diperbarui." };
  } catch (err) {
    if (
      (err instanceof Error && err.message === "CANDIDATE_NUMBER_EXISTS") ||
      isUniqueViolation(err)
    ) {
      return {
        ok: false,
        errors: {
          candidate_number: [
            "Nomor urut ini sudah digunakan oleh kandidat lain dalam pemilihan yang sama.",
          ],
        },
      };
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal memperbarui kandidat. Terjadi kesalahan server."],
      },
    };
  }
}

export async function deleteCandidateAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const candidateId = formData.get("candidate_id");
  if (typeof candidateId !== "string" || !candidateId)
    return { ok: false, errors: { _form: ["ID tidak valid."] } };
  try {
    await deleteCandidate(
      candidateId,
      user.role === "SUPER_ADMIN" ? null : user.organizationId,
    );
    revalidatePath("/admin/candidates");
    revalidatePath("/admin/elections");
    return { ok: true, message: "Kandidat berhasil dihapus." };
  } catch (err) {
    if (err instanceof Error && err.message === "CANDIDATE_HAS_VOTES") {
      return {
        ok: false,
        errors: {
          _form: [
            "Kandidat tidak dapat dihapus karena sudah memiliki suara yang masuk.",
          ],
        },
      };
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal menghapus kandidat. Terjadi kesalahan server."],
      },
    };
  }
}
