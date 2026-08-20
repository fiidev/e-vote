import { describe, expect, it } from "vitest";
import { formatDate, formatToken, normalizeToken } from "./format";

describe("normalizeToken", () => {
  it("menghilangkan dash", () => {
    expect(normalizeToken("4821-9037")).toBe("48219037");
  });

  it("menghilangkan spasi", () => {
    expect(normalizeToken("4821 9037")).toBe("48219037");
  });

  it("membiarkan 8 digit murni", () => {
    expect(normalizeToken("48219037")).toBe("48219037");
  });
});

describe("formatToken", () => {
  it("memformat 8 digit menjadi XXXX-XXXX", () => {
    expect(formatToken("48219037")).toBe("4821-9037");
  });

  it("menormalkan input ber-dash dulu", () => {
    expect(formatToken("4821-9037")).toBe("4821-9037");
  });

  it("mengembalikan input apa adanya bila bukan 8 digit", () => {
    expect(formatToken("123")).toBe("123");
  });
});

describe("formatDate", () => {
  it("memformat tanggal dalam bahasa Indonesia", () => {
    // 20 Agustus 2026, 08:00 WIB
    const date = new Date("2026-08-20T08:00:00+07:00");
    expect(formatDate(date)).toMatch(/20 Agustus 2026/);
  });
});
