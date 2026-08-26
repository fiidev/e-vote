import type { VoteErrorCode } from "@/types/error";

export const VOTE_ERROR_MESSAGES: Record<VoteErrorCode, string> = {
  TOKEN_INVALID: "Token tidak valid. Periksa kembali token Anda.",
  TOKEN_ALREADY_USED: "Token ini sudah digunakan untuk memilih.",
  TOKEN_LOCKED: "Terlalu banyak percobaan gagal. Silakan coba lagi nanti.",
  ELECTION_NOT_STARTED: "Pemilihan belum dimulai.",
  ELECTION_ENDED: "Pemilihan sudah berakhir.",
  ELECTION_NOT_FOUND: "Pemilihan tidak ditemukan atau tidak aktif.",
  VOTER_NOT_ELIGIBLE: "Anda tidak berhak memilih dalam pemilihan ini.",
  CANDIDATE_NOT_FOUND: "Kandidat tidak ditemukan.",
  RATE_LIMITED: "Terlalu banyak permintaan. Mohon tunggu beberapa saat.",
  NO_VOTE_SESSION:
    "Sesi memilih telah berakhir. Silakan masukkan token kembali.",
  ALREADY_VOTED: "Anda sudah menggunakan hak suara Anda.",
  EMAIL_SEND_FAILED: "Gagal mengirimkan email token voting.",
  INVALID_INPUT: "Data yang dimasukkan tidak valid.",
};

export function voteErrorMessage(code: VoteErrorCode): string {
  return VOTE_ERROR_MESSAGES[code] ?? "Terjadi kesalahan. Silakan coba lagi.";
}
