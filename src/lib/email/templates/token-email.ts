/**
 * Email template builder — PURE function, tanpa I/O & tanpa import env.
 * Format: tabel + inline style (Gmail-safe), text/plain wajib,
 * zero hardcoded domain (URL dibangun dari appUrl param).
 * HTML di-escape manual — jangan pernah interpolasi raw user input.
 * Nilai sekolah/lokasi dikirim eksplisit dari caller (lib/email/service.ts).
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface TokenEmailParams {
  to: string;
  voterName: string;
  tokenCode: string; // 8 digit, display XXXX-XXXX
  electionTitle: string;
  schoolName: string;
  location: string;
  appUrl: string; // base URL aplikasi, tanpa trailing slash
}

export interface BuiltEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

import { formatToken } from "@/lib/utils/format";

export function buildTokenEmail(params: TokenEmailParams): BuiltEmail {
  const voterName = escapeHtml(params.voterName);
  const electionTitle = escapeHtml(params.electionTitle);
  const schoolName = escapeHtml(params.schoolName);
  const location = escapeHtml(params.location);
  const tokenDisplay = formatToken(params.tokenCode);
  const voteUrl = `${params.appUrl.replace(/\/$/, "")}/verify`;

  const html = `<!DOCTYPE html>
<html lang="id">
  <body style="margin:0;padding:0;background-color:#f7f6f4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e4e4e4;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#00373e;padding:24px 32px;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">${schoolName}</p>
                <p style="margin:4px 0 0;color:#f9e6d0;font-size:13px;">E-Pilketos — ${electionTitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.6;">Halo <strong>${voterName}</strong>,</p>
                <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.6;">
                  Gunakan token di bawah untuk memberikan suara pada
                  <strong>${electionTitle}</strong> di ${location}.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9e6d0;border:2px dashed #00373e;border-radius:10px;margin:8px 0 20px;">
                  <tr>
                    <td align="center" style="padding:20px 16px;">
                      <p style="margin:0;color:#00373e;font-size:30px;font-weight:bold;letter-spacing:6px;">${tokenDisplay}</p>
                      <p style="margin:6px 0 0;color:#00373e;font-size:12px;">Token bersifat RAHASIA — jangan bagikan ke siapa pun.</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="background-color:#00373e;border-radius:8px;">
                      <a href="${voteUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Mulai Voting</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;color:#666666;font-size:12px;line-height:1.6;">
                  Token hanya dapat digunakan <strong>sekali</strong> dan berlaku selama jadwal pemilihan berlangsung.
                </p>
                <p style="margin:0;color:#666666;font-size:12px;line-height:1.6;">
                  Jika Anda tidak merasa meminta email ini, abaikan saja.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f7f6f4;padding:16px 32px;border-top:1px solid #e4e4e4;">
                <p style="margin:0;color:#999999;font-size:11px;text-align:center;">© ${new Date().getFullYear()} ${schoolName} — Panitia E-Pilketos</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${schoolName} — E-Pilketos: ${electionTitle}`,
    "",
    `Halo ${params.voterName},`,
    "",
    `Gunakan token di bawah untuk memberikan suara pada ${electionTitle} di ${location}.`,
    "",
    `TOKEN: ${tokenDisplay}`,
    "",
    `Buka ${voteUrl} lalu masukkan token tersebut.`,
    "Token bersifat RAHASIA — jangan bagikan ke siapa pun.",
    "Token hanya dapat digunakan sekali dan berlaku selama jadwal pemilihan berlangsung.",
    "",
    `© ${new Date().getFullYear()} ${schoolName} — Panitia E-Pilketos`,
  ].join("\n");

  return {
    to: params.to,
    subject: `Token Voting ${electionTitle} — ${schoolName}`,
    html,
    text,
  };
}
