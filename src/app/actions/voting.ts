"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isVoteError } from "@/lib/vote/errors";
import { castVoteSchema, verifyTokenSchema } from "@/lib/vote/schemas";
import { castVote, verifyToken } from "@/lib/vote/service";
import {
  clearVoteSession,
  getVoteSession,
  setVoteSession,
} from "@/lib/vote/session";
import type { VoteErrorCode } from "@/types/error";

/**
 * Server actions voting (dipakai form di /verify, /vote).
 * Pattern: zod parse → service → error contract ({ error: code }) → redirect.
 * UI cukup memetakan VoteErrorCode ke pesan (lihat lib/vote/errors.ts).
 */

export type VoteActionState = { error?: VoteErrorCode } | undefined;

/** Langkah 1: verifikasi token → simpan vote session → redirect /vote. */
export async function verifyTokenAction(
  _prev: VoteActionState,
  formData: FormData,
): Promise<VoteActionState> {
  const parsed = verifyTokenSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return { error: "INVALID_INPUT" };

  try {
    await verifyToken(parsed.data);
    await setVoteSession(parsed.data.token);
    revalidatePath("/vote");
    redirect("/vote");
  } catch (error) {
    if (isVoteError(error)) return { error: error.code };
    throw error;
  }
}

/** Langkah 2: cast vote → bersihkan session → redirect /success. */
export async function castVoteAction(
  _prev: VoteActionState,
  formData: FormData,
): Promise<VoteActionState> {
  // Token harus ada di session — tanpa session, tolak (jangan pernah
  // menerima token dari form di langkah ini; itu celah double-vote).
  const token = await getVoteSession();
  if (!token) return { error: "NO_VOTE_SESSION" };

  const parsed = castVoteSchema.safeParse({
    candidateId: formData.get("candidateId"),
  });
  if (!parsed.success) return { error: "INVALID_INPUT" };

  try {
    await castVote({ token, candidateId: parsed.data.candidateId });
    await clearVoteSession();
    revalidatePath("/success");
    redirect("/success");
  } catch (error) {
    if (isVoteError(error)) return { error: error.code };
    throw error;
  }
}
