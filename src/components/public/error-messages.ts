import type { VoteErrorCode } from "@/types/error";

const UI_MESSAGES: Record<VoteErrorCode, string> = {
  TOKEN_INVALID: "Token yang kamu masukkan salah. Coba cek ulang angkanya, ya!",
  TOKEN_ALREADY_USED:
    "Token ini sudah dipakai sebelumnya. Kalau merasa belum vote, hubungi panitia.",
  TOKEN_LOCKED: "Token sedang diproses. Tunggu beberapa detik, lalu coba lagi.",
  ELECTION_NOT_FOUND:
    "Pemilihan belum tersedia. Tunggu pengumuman dari panitia.",
  ELECTION_NOT_STARTED: "Pemilihan belum dimulai. Sabar ya, tunggu waktunya!",
  ELECTION_ENDED: "Pemilihan sudah selesai. Terima kasih sudah ikut!",
  ALREADY_VOTED: "Kamu sudah vote! Tidak bisa vote dua kali.",
  CANDIDATE_NOT_FOUND: "Kandidat tidak ditemukan. Coba pilih ulang.",
  NO_VOTE_SESSION:
    "Sesi kamu sudah habis. Silakan masukkan token lagi dari awal.",
  RATE_LIMITED: "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.",
  VOTER_NOT_ELIGIBLE:
    "Kamu tidak terdaftar sebagai pemilih. Hubungi panitia untuk info lebih lanjut.",
  INVALID_INPUT: "Data tidak lengkap. Silakan isi ulang.",
  EMAIL_SEND_FAILED: "Gagal mengirim email. Hubungi panitia.",
};

export function voteErrorMessage(code: VoteErrorCode): string {
  return UI_MESSAGES[code];
}
