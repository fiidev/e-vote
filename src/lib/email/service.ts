import nodemailer from "nodemailer";
import db from "@/lib/db";
import { env } from "@/lib/env";
import { buildTokenEmail, type BuiltEmail } from "@/lib/email/templates/token-email";
import { formatToken } from "@/lib/utils/format";

/**
 * Email service — kirim token via SMTP sekolah.
 * - Rate limit: SMTP_RATE_PER_MINUTE (default 100/menit), delay antar email.
 * - Daily cap: SMTP_DAILY_CAP (default 1990) — dihitung dari EmailLog.
 * - Per-item error: skip email yang gagal (tidak pernah abort batch).
 * - Retry 2× per email (delay kecil), lalu catat error di EmailLog.
 * - Status: SENT | FAILED | RESEND | NO_EMAIL
 */

export const EMAIL_STATUS = {
  SENT: "SENT",
  FAILED: "FAILED",
  RESEND: "RESEND",
  NO_EMAIL: "NO_EMAIL",
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export interface EmailSendResult {
  sent: number;
  failed: number;
  noEmail: number;
  skippedDueToCap: number;
  errors: Array<{ voterId: string; email: string; error: string }>;
}

export interface TokenMailItem {
  voter_id: string;
  voter_name: string;
  voter_email: string;
  token_id: string;
  token_code: string;
  election_title: string;
  resend?: boolean; // true = status RESEND (edit email / kirim ulang manual)
}

/** Delay agar tidak melewati rate limit SMTP per menit. */
function computeDelayMs(ratePerMinute: number): number {
  if (ratePerMinute <= 0) return 0;
  return Math.ceil(60_000 / ratePerMinute);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    // Timeout agar batch tidak menggantung pada SMTP lambat
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

/** Hitung sisa kuota hari ini berdasarkan EmailLog. */
export async function getRemainingDailyCap(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sentToday = await db.emailLog.count({
    where: {
      status: { in: [EMAIL_STATUS.SENT, EMAIL_STATUS.RESEND] },
      sent_at: { gte: startOfDay },
    },
  });

  return Math.max(0, env.SMTP_DAILY_CAP - sentToday);
}

async function logEmail(
  tokenId: string,
  voterId: string,
  email: string,
  status: EmailStatus,
  error?: string | null,
) {
  await db.emailLog.create({
    data: { token_id: tokenId, voter_id: voterId, email, status, error },
  });
}

/**
 * Kirim token email secara batch (sequential + delay untuk rate limit).
 * Selalu update token.email_sent_at / email_error per item.
 */
export async function sendTokenEmails(items: TokenMailItem[]): Promise<EmailSendResult> {
  const result: EmailSendResult = {
    sent: 0,
    failed: 0,
    noEmail: 0,
    skippedDueToCap: 0,
    errors: [],
  };
  if (items.length === 0) return result;

  const remainingCap = await getRemainingDailyCap();
  const usable = items.slice(0, Math.max(0, remainingCap));
  result.skippedDueToCap = items.length - usable.length;

  if (usable.length === 0) return result;

  const transporter = createTransporter();
  const delayMs = computeDelayMs(env.SMTP_RATE_PER_MINUTE);

  for (const item of usable) {
    const email = item.voter_email?.trim();
    if (!email) {
      result.noEmail++;
      await logEmail(item.token_id, item.voter_id, "", EMAIL_STATUS.NO_EMAIL);
      continue;
    }

    const built: BuiltEmail = buildTokenEmail({
      to: email,
      voterName: item.voter_name,
      tokenCode: item.token_code,
      electionTitle: item.election_title,
      schoolName: env.SCHOOL_NAME,
      location: env.VOTING_LOCATION,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    });

    let lastError: unknown;
    let ok = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await transporter.sendMail({
          from: `"${env.FROM_NAME}" <${env.SMTP_USER}>`,
          to: built.to,
          subject: built.subject,
          html: built.html,
          text: built.text,
        });
        ok = true;
        break;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    if (ok) {
      result.sent++;
      await db.voteToken.update({
        where: { token_id: item.token_id },
        data: { email_sent_at: new Date(), email_error: null },
      });
      await logEmail(
        item.token_id,
        item.voter_id,
        email,
        item.resend ? EMAIL_STATUS.RESEND : EMAIL_STATUS.SENT,
      );
    } else {
      result.failed++;
      const msg =
        lastError instanceof Error ? lastError.message : "SMTP error tidak diketahui";
      result.errors.push({ voterId: item.voter_id, email, error: msg });
      await db.voteToken.update({
        where: { token_id: item.token_id },
        data: { email_error: msg },
      });
      await logEmail(item.token_id, item.voter_id, email, EMAIL_STATUS.FAILED, msg);
    }

    // Rate limit: jeda antar email; cap kecil di test / batch kecil
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 2_000)));
    }
  }

  await transporter.close();
  return result;
}

/** Kirim ulang satu token (status RESEND) — dipakai setelah edit email. */
export async function resendTokenEmail(
  token: TokenMailItem,
): Promise<EmailSendResult> {
  return sendTokenEmails([{ ...token, resend: true }]);
}

export { formatToken };