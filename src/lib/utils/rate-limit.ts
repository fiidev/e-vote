/**
 * Rate limiter kiosk-mode (in-memory, per instance).
 *
 * Bukan per-IP: semua laptop di ruang voting berbagi satu IP.
 * Dua lapis proteksi:
 *  - Per token: 5× percobaan gagal → token dikunci (TOKEN_LOCKED).
 *  - Global: 50 kegagalan/menit → semua permintaan ditolak (RATE_LIMITED).
 *
 * Catatan: state hilang saat server restart — acceptable untuk MVP kiosk
 * (ruangan diawasi). Bila butuh persistensi, ganti dengan Redis.
 */

export interface RateLimiterOptions {
  /** Percobaan gagal sebelum token dikunci. */
  maxAttemptsPerToken?: number;
  /** Kegagalan global per window sebelum throttle. */
  maxGlobalFailuresPerWindow?: number;
  /** Durasi window global dalam ms (default 1 menit). */
  windowMs?: number;
}

export interface RateLimiter {
  isTokenLocked(token: string): boolean;
  recordTokenFailure(token: string): void;
  resetTokenAttempts(token: string): void;
  isGloballyThrottled(): boolean;
  recordGlobalFailure(): void;
  /** Bersihkan semua state (digunakan saat token sukses & untuk test). */
  reset(): void;
}

export function createRateLimiter(
  options: RateLimiterOptions = {},
): RateLimiter {
  const {
    maxAttemptsPerToken = 5,
    maxGlobalFailuresPerWindow = 50,
    windowMs = 60_000,
  } = options;

  const tokenAttempts = new Map<string, number>();
  let globalCount = 0;
  let globalWindowStart = Date.now();

  function rollWindowIfNeeded(now: number): void {
    if (now - globalWindowStart >= windowMs) {
      globalCount = 0;
      globalWindowStart = now;
    }
  }

  return {
    isTokenLocked(token: string): boolean {
      return (tokenAttempts.get(token) ?? 0) >= maxAttemptsPerToken;
    },

    recordTokenFailure(token: string): void {
      tokenAttempts.set(token, (tokenAttempts.get(token) ?? 0) + 1);
    },

    resetTokenAttempts(token: string): void {
      tokenAttempts.delete(token);
    },

    isGloballyThrottled(): boolean {
      rollWindowIfNeeded(Date.now());
      return globalCount >= maxGlobalFailuresPerWindow;
    },

    recordGlobalFailure(): void {
      rollWindowIfNeeded(Date.now());
      globalCount += 1;
    },

    reset(): void {
      tokenAttempts.clear();
      globalCount = 0;
      globalWindowStart = Date.now();
    },
  };
}

/** Singleton default — dipakai aplikasi. Test memakai createRateLimiter() sendiri. */
export const rateLimiter = createRateLimiter();
