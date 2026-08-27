"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  adminProvisionSchema,
  organizationCreateSchema,
  organizationUpdateSchema,
} from "@/features/organizations/schemas";
import {
  createOrganization,
  deleteOrganization,
  provisionAdminUser,
  removeAdminUser,
  updateOrganization,
} from "@/features/organizations/service";
import { getAuthUser } from "@/lib/auth";
import type { ActionState } from "@/types/action-state";

async function requireSuperAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
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

export async function createOrganizationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();
  const result = parseForm(organizationCreateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await createOrganization(result.data);
    revalidatePath("/admin/organizations");
    return { ok: true, message: "Organisasi berhasil dibuat." };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "ORG_SLUG_EXISTS") {
        return {
          ok: false,
          errors: { slug: ["Slug organisasi sudah digunakan."] },
        };
      }
      if (err.message === "ORG_CODE_EXISTS") {
        return {
          ok: false,
          errors: { code: ["Kode prefix organisasi sudah digunakan."] },
        };
      }
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal membuat organisasi. Terjadi kesalahan server."],
      },
    };
  }
}

export async function updateOrganizationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();
  const result = parseForm(organizationUpdateSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await updateOrganization(result.data);
    revalidatePath("/admin/organizations");
    return { ok: true, message: "Organisasi berhasil diperbarui." };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "ORG_SLUG_EXISTS") {
        return {
          ok: false,
          errors: { slug: ["Slug organisasi sudah digunakan."] },
        };
      }
      if (err.message === "ORG_CODE_EXISTS") {
        return {
          ok: false,
          errors: { code: ["Kode prefix organisasi sudah digunakan."] },
        };
      }
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal memperbarui organisasi. Terjadi kesalahan server."],
      },
    };
  }
}

export async function deleteOrganizationAction(
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, errors: { _form: ["ID organisasi tidak valid."] } };
  }

  try {
    await deleteOrganization(id);
    revalidatePath("/admin/organizations");
    return { ok: true, message: "Organisasi berhasil dihapus." };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "ORG_HAS_ELECTIONS") {
        return {
          ok: false,
          errors: {
            _form: [
              "Organisasi tidak dapat dihapus karena memiliki data pemilihan.",
            ],
          },
        };
      }
      if (err.message === "ORG_HAS_CHILDREN") {
        return {
          ok: false,
          errors: {
            _form: [
              "Organisasi induk tidak dapat dihapus karena masih memiliki sub-organisasi.",
            ],
          },
        };
      }
    }
    return {
      ok: false,
      errors: {
        _form: ["Gagal menghapus organisasi. Terjadi kesalahan server."],
      },
    };
  }
}

export async function provisionAdminUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();
  const result = parseForm(adminProvisionSchema, formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await provisionAdminUser(result.data);
    revalidatePath("/admin/organizations");
    return { ok: true, message: "Administrator berhasil didaftarkan." };
  } catch (_err) {
    return {
      ok: false,
      errors: {
        _form: ["Gagal mendaftarkan administrator. Terjadi kesalahan server."],
      },
    };
  }
}

export async function removeAdminUserAction(
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();
  const userId = formData.get("user_id");
  if (typeof userId !== "string" || !userId) {
    return { ok: false, errors: { _form: ["ID admin tidak valid."] } };
  }

  try {
    await removeAdminUser(userId);
    revalidatePath("/admin/organizations");
    return { ok: true, message: "Akses administrator berhasil dicabut." };
  } catch (_err) {
    return {
      ok: false,
      errors: {
        _form: ["Gagal mencabut akses admin. Terjadi kesalahan server."],
      },
    };
  }
}
