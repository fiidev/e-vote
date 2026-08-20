import { describe, expect, it } from "vitest";
import { buildTokenEmail } from "./token-email";

describe("buildTokenEmail", () => {
  const params = {
    to: "budi@smktelkom-mlg.sch.id",
    voterName: "Budi <b>Santoso</b>",
    tokenCode: "12345678",
    electionTitle: "Pilketos 2026",
    schoolName: "SMK Telkom Malang",
    location: "Gedung Serbaguna",
    appUrl: "http://localhost:3000",
  };

  it("format token XXXX-XXXX di html & text", () => {
    const email = buildTokenEmail(params);
    expect(email.html).toContain("1234-5678");
    expect(email.text).toContain("1234-5678");
  });

  it("escape HTML injection pada nama & judul", () => {
    const email = buildTokenEmail({
      ...params,
      voterName: "<script>alert(1)</script>",
      electionTitle: "<b>Judul</b>",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    // judul di-escape juga
    expect(email.html).toContain("&lt;b&gt;Judul&lt;/b&gt;");
  });

  it("selalu menyertakan text/plain version", () => {
    const email = buildTokenEmail(params);
    expect(email.text.length).toBeGreaterThan(0);
    expect(email.text).toContain("TOKEN: 1234-5678");
  });

  it("subject memuat judul pemilihan", () => {
    const email = buildTokenEmail(params);
    expect(email.subject).toContain("Pilketos 2026");
  });

  it("tidak menampilkan URL domain di email", () => {
    const email = buildTokenEmail({
      ...params,
      appUrl: "http://localhost:3000/",
    });
    // HTML tidak boleh mengandung URL domain
    expect(email.html).not.toContain("http://localhost:3000");
    expect(email.html).not.toContain("https://");
    // Text tidak boleh mengandung URL
    expect(email.text).not.toContain("http://localhost:3000");
  });

  it("inline style tanpa hardcoded domain", () => {
    const email = buildTokenEmail(params);
    expect(email.html).toContain("style=");
    // Tidak boleh ada URL hardcoded di template
    expect(email.html).not.toContain("http://");
    expect(email.html).not.toContain("https://");
  });
});
