/**
 * Formatting helpers untuk token voting & tanggal.
 */

/** Hilangkan semua separator (spasi, dash) — hasil: 8 digit murni. */
export function normalizeToken(token: string): string {
  return token.replace(/[\s-]/g, "");
}

/** Format 8 digit → "4821-9037". Input apa pun dinormalisasi dulu. */
export function formatToken(token: string): string {
  const normalized = normalizeToken(token);
  if (normalized.length !== 8) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

/** Tanggal dalam format Indonesia, e.g. "20 Agustus 2026 pukul 08.00". */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}
