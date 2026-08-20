import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildRecapBuffer,
  buildTokenListBuffer,
  buildVoterTemplateBuffer,
  parseVoterImport,
} from "./service";

function sheetToAoa(buffer: Buffer, sheetName: string): unknown[][] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
}

function buildImportBuffer(rows: unknown[][], sheet = "Pemilih"): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("buildVoterTemplateBuffer", () => {
  it("header persis + 1 baris contoh", () => {
    const buffer = buildVoterTemplateBuffer();
    const aoa = sheetToAoa(buffer, "Pemilih");
    expect(aoa[0]).toEqual(["Nama", "Email", "Role", "Angkatan"]);
    expect(aoa[1]).toEqual(["Contoh Nama", "contoh@email.com", "SISWA", "34"]);
  });
});

describe("parseVoterImport", () => {
  it("parse file valid → rows ok", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role", "Angkatan"],
      ["Budi", "budi@x.id", "SISWA", "34"],
      ["Ani", "ani@x.id", "osis", "33"],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ name: "Budi", email: "budi@x.id", role: "SISWA", generation: "34" });
    // role case-insensitive → OSIS
    expect(result.rows[1].role).toBe("OSIS");
    // email di-lowercase
    expect(result.rows[1].email).toBe("ani@x.id");
  });

  it("role kosong default SISWA", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role", "Angkatan"],
      ["Budi", "budi@x.id", "", ""],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(true);
    expect(result.rows[0].role).toBe("SISWA");
    expect(result.rows[0].generation).toBeNull();
  });

  it("tolak file jika sheet bukan Pemilih", () => {
    const buffer = buildImportBuffer([["Nama", "Email"]], "Lain");
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain("Pemilih");
  });

  it("tolak file jika header salah", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role"],
      ["Budi", "budi@x.id", "SISWA"],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(false);
    expect(result.errors[0].row).toBe(1);
  });

  it("tolak file jika ada baris contoh template", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role", "Angkatan"],
      ["Contoh Nama", "contoh@email.com", "SISWA", "34"],
      ["Budi", "budi@x.id", "SISWA", "34"],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain("contoh");
  });

  it("tolak file jika email duplikat dalam file", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role", "Angkatan"],
      ["Budi", "budi@x.id", "SISWA", "34"],
      ["Budi2", "BUDI@x.id", "SISWA", "34"],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("duplikat");
  });

  it("tolak baris dengan email tidak valid", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role", "Angkatan"],
      ["Budi", "bukan-email", "SISWA", "34"],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain("Email tidak valid");
  });

  it("skip baris kosong penuh", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role", "Angkatan"],
      ["", "", "", ""],
      ["Budi", "budi@x.id", "SISWA", "34"],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(1);
  });

  it("tolak role tidak dikenal", () => {
    const buffer = buildImportBuffer([
      ["Nama", "Email", "Role", "Angkatan"],
      ["Budi", "budi@x.id", "ALIEN", "34"],
    ]);
    const result = parseVoterImport(buffer);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain("Role tidak dikenal");
  });
});

describe("Export buffers", () => {
  it("buildRecapBuffer: header + rows", () => {
    const buffer = buildRecapBuffer([
      {
        electionTitle: "Pilketos 2026",
        candidateNumber: 1,
        candidateName: "Budi",
        className: "XI-1",
        votes: 10,
        percentage: "55.6%",
      },
    ]);
    const aoa = sheetToAoa(buffer, "Rekapitulasi");
    expect(aoa[0]).toEqual(["Pemilihan", "No", "Nama Kandidat", "Kelas", "Suara", "Persentase"]);
    expect(aoa[1]).toContain("Budi");
  });

  it("buildTokenListBuffer: token diformat XXXX-XXXX", () => {
    const buffer = buildTokenListBuffer([
      {
        voterName: "Budi",
        voterEmail: "budi@x.id",
        role: "SISWA",
        tokenDisplay: "12345678",
        emailStatus: "SENT",
        used: "Belum",
      },
    ]);
    const aoa = sheetToAoa(buffer, "Token");
    expect(aoa[1]).toContain("1234-5678");
  });
});