import type { VoteErrorCode } from "@/types/error";

/**
 * Pemetaan VoteErrorCode → pesan UI (versi ramah kiosk, lebih singkat dari
 * pesan server). Pure function — diuji unit.
 */
const UI_MESSAGES: Record<VoteErrorCode, string> = {
  TOKEN_INVALID: "Token tidak valid. Periksa kembali token dari email kamu.",
  TOKEN_ALREADY_USED: "Token sudah digunakan. Hubungi panitia jika ini keliru.",
  TOKEN_LOCKED: "Token sedang diproses. Tunggu sebentar, lalu coba lagi.",
  ELECTION_NOT_FOUND: "Pemilihan belum tersedia. Hubungi panitia.",
  ELECTION_NOT_STARTED: "Pemilihan belum dimulai. Silakan tunggu.",
  ELECTION_ENDED: "Pemilihan sudah berakhir. Terima kasih!",
  ALREADY_VOTED: "Kamu sudah menggunakan hak suara. Terima kasih!",
  CANDIDATE_NOT_FOUND: "Kandidat tidak ditemukan. Pilih kandidat lain.",
  NO_VOTE_SESSION: "Sesi voting tidak aktif. Silakan verifikasi token kembali.",
  RATE_LIMITED: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
  VOTER_NOT_ELIGIBLE:
    "Kamu tidak terdaftar untuk pemilihan ini. Hubungi panitia.",
  INVALID_INPUT: "Data yang dikirim tidak valid. Coba lagi.",
  EMAIL_SEND_FAILED: "Terjadi kendala teknis. Hubungi panitia.",
};

export function voteErrorMessage(code: VoteErrorCode): string {
  return UI_MESSAGES[code];
}