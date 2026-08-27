import { voteErrorMessage } from "@/features/voting/error-messages";
import type { VoteErrorCode } from "@/types/error";

export class VoteError extends Error {
  public readonly code: VoteErrorCode;
  public readonly statusCode: number;

  constructor(code: VoteErrorCode, customMessage?: string, statusCode = 400) {
    const message = customMessage ?? voteErrorMessage(code);
    super(message);

    this.name = "VoteError";
    this.code = code;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, VoteError.prototype);
  }
}

export function isVoteError(error: unknown): error is VoteError {
  return error instanceof VoteError;
}
