import type { VoteErrorCode } from "@/types/error";

const ERROR_MESSAGES: Record<VoteErrorCode, string> = {
  TOKEN_INVALID: "Token voting tidak valid atau kedaluwarsa.",
  TOKEN_ALREADY_USED: "Token voting sudah pernah digunakan.",
  TOKEN_LOCKED: "Token sedang dikunci karena proses transaksi lain.",
  ELECTION_NOT_FOUND: "Data pemilihan tidak ditemukan.",
  ELECTION_NOT_STARTED: "Pemilihan belum dimulai.",
  ELECTION_ENDED: "Pemilihan sudah berakhir.",
  ALREADY_VOTED: "Anda sudah menggunakan hak suara Anda.",
  CANDIDATE_NOT_FOUND: "Kandidat yang Anda pilih tidak ditemukan.",
  NO_VOTE_SESSION: "Sesi voting tidak aktif atau tidak ditemukan.",
  RATE_LIMITED: "Terlalu banyak permintaan. Silakan coba sesaat lagi.",
  VOTER_NOT_ELIGIBLE:
    "Anda tidak terdaftar atau tidak memenuhi syarat untuk memilih.",
  INVALID_INPUT: "Data masukan yang dikirimkan tidak valid.",
  EMAIL_SEND_FAILED: "Gagal mengirimkan email token voting.",
};

export class VoteError extends Error {
  public readonly code: VoteErrorCode;
  public readonly statusCode: number;

  constructor(code: VoteErrorCode, customMessage?: string, statusCode = 400) {
    const message = customMessage ?? ERROR_MESSAGES[code];
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
