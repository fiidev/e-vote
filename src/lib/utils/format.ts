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

/** Format rentang jadwal ringkas: e.g. "27 Agu 09:07 → 03 Sep 10:07" */
export function formatScheduleRange(
  startDate: Date | string,
  endDate: Date | string,
): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const formatPart = (d: Date) => {
    const day = d.getDate();
    const month = d.toLocaleDateString("id-ID", { month: "short" });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${hours}:${minutes}`;
  };

  return `${formatPart(start)} → ${formatPart(end)}`;
}
