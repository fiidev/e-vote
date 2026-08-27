"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isVoteError } from "@/features/voting/errors";
import { castVoteSchema, verifyTokenSchema } from "@/features/voting/schemas";
import { castVote, verifyToken } from "@/features/voting/service";
import {
  clearVoteSession,
  getVoteSession,
  setVoteSession,
} from "@/features/voting/session";
import type { VoteErrorCode } from "@/types/error";

/**
 * Server actions voting (dipakai form di /verify, /vote).
 * Pattern: zod parse → service → error contract ({ error: code }) → redirect.
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
