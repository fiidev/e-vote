import * as XLSX from "xlsx";
import type { Role } from "@/generated/prisma/enums";
import { formatToken } from "@/lib/utils/format";

/**
 * Excel service — import/export pemilih (kontrak §4.2 FINAL_PLAN).
 * PURE: parsing & building saja, TIDAK menyentuh db (transaksi di actions).
 *
 * Kontrak file import:
 * - Sheet "Pemilih", header row 1 persis: Nama | Email | Role | Angkatan
 * - Role case-insensitive/trim → enum (default SISWA)
 * - Email duplikat dalam file → error baris
 * - Header salah / ada baris contoh → tolak SELURUH file (rollback di action)
 * - Template berisi 1 baris contoh yang ditolak parser
 */

export const IMPORT_SHEET_NAME = "Pemilih";
export const IMPORT_HEADER = ["Nama", "Email", "Role", "Angkatan"] as const;

export const ROLE_LABELS: Record<Role, string> = {
  SISWA: "SISWA",
  OSIS: "OSIS",
  MPK: "MPK",
  GUKAR: "GUKAR",
};

function normalizeRole(raw: string): Role | null {
  const value = raw.trim().toUpperCase();
  if (value in ROLE_LABELS) return value as Role;
  return null;
}

export interface ParsedVoterRow {
  row: number; // baris di excel (1-based)
  name: string;
  email: string;
  role: Role;
  generation: string | null;
}

export interface ImportParseResult {
  ok: boolean;
  rows: ParsedVoterRow[];
  errors: Array<{ row: number; message: string }>;
}

const isExampleRow = (name: string, email: string) =>
  name.trim().toLowerCase().startsWith("contoh") ||
  email.trim().toLowerCase().startsWith("contoh@");

/** Parse buffer excel → rows siap import. Tolak seluruh file jika ada error. */
export function parseVoterImport(buffer: ArrayBuffer | Buffer): ImportParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const errors: ImportParseResult["errors"] = [];

  const ws = wb.Sheets[IMPORT_SHEET_NAME];
  if (!ws) {
    return {
      ok: false,
      rows: [],
      errors: [{ row: 0, message: `Sheet "${IMPORT_SHEET_NAME}" tidak ditemukan.` }],
    };
  }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" });
  if (raw.length === 0) {
    return { ok: false, rows: [], errors: [{ row: 0, message: "File kosong." }] };
  }

  const header = raw[0].map((c) => String(c).trim().toLowerCase());
  const expected = IMPORT_HEADER.map((h) => h.toLowerCase());
  const headerOk =
    header.length === expected.length && expected.every((h, i) => header[i] === h);
  if (!headerOk) {
    return {
      ok: false,
      rows: [],
      errors: [
        {
          row: 1,
          message: `Header harus persis: ${IMPORT_HEADER.join(" | ")}.`,
        },
      ],
    };
  }

  const rows: ParsedVoterRow[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < raw.length; i++) {
    const rowNum = i + 1;
    const [nameRaw, emailRaw, roleRaw, generationRaw] = raw[i] as unknown[];

    const name = String(nameRaw ?? "").trim();
    const email = String(emailRaw ?? "").trim().toLowerCase();

    // Baris kosong penuh → skip (tidak dianggap error)
    if (!name && !email && !String(roleRaw ?? "").trim() && !String(generationRaw ?? "").trim()) {
      continue;
    }

    if (isExampleRow(name, email)) {
      errors.push({
        row: rowNum,
        message: "Baris contoh template — hapus baris ini sebelum mengimpor.",
      });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, message: "Nama kosong." });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, message: "Email tidak valid." });
      continue;
    }
    if (seenEmails.has(email)) {
      errors.push({ row: rowNum, message: `Email duplikat: ${email}.` });
      continue;
    }
    const role = normalizeRole(String(roleRaw ?? "").trim() || "SISWA");
    if (!role) {
      errors.push({
        row: rowNum,
        message: `Role tidak dikenal: "${roleRaw}". Gunakan SISWA/OSIS/MPK/GUKAR.`,
      });
      continue;
    }

    seenEmails.add(email);
    rows.push({
      row: rowNum,
      name,
      email,
      role,
      generation: String(generationRaw ?? "").trim() || null,
    });
  }

  if (errors.length > 0) {
    return { ok: false, rows, errors }; // action: rollback semua
  }
  return { ok: true, rows, errors: [] };
}

// ─── Export helpers ────────────────────────────────────────────────────────

/** Buffer template import (header + 1 baris contoh yang ditolak parser). */
export function buildVoterTemplateBuffer(): Buffer {
  const aoa: unknown[][] = [
    [...IMPORT_HEADER],
    ["Contoh Nama", "contoh@email.com", "SISWA", "34"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, IMPORT_SHEET_NAME);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export interface RecapRow {
  electionTitle: string;
  candidateNumber: number;
  candidateName: string;
  className: string;
  votes: number;
  percentage: string;
}

/** Buffer rekapitulasi suara per kandidat per election. */
export function buildRecapBuffer(rows: RecapRow[]): Buffer {
  const aoa: unknown[][] = [
    ["Pemilihan", "No", "Nama Kandidat", "Kelas", "Suara", "Persentase"],
    ...rows.map((r) => [
      r.electionTitle,
      r.candidateNumber,
      r.candidateName,
      r.className,
      r.votes,
      r.percentage,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekapitulasi");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export interface TokenExportRow {
  voterName: string;
  voterEmail: string;
  role: string;
  tokenDisplay: string;
  emailStatus: string;
  used: string;
}

/** Buffer daftar token per voter (display XXXX-XXXX). */
export function buildTokenListBuffer(rows: TokenExportRow[]): Buffer {
  const aoa: unknown[][] = [
    ["Nama", "Email", "Role", "Token", "Status Email", "Sudah Digunakan"],
    ...rows.map((r) => [
      r.voterName,
      r.voterEmail,
      r.role,
      formatToken(r.tokenDisplay),
      r.emailStatus,
      r.used,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Token");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}