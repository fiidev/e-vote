# ✅ TASK LIST — E-PILKETOS 2.0

> Source of truth: `docs/FINAL_PLAN.md` — baca dulu sebelum mulai.
> Checklist: centang `[x]` kalau udah selesai. Verifikasi tiap task: `npx tsc --noEmit` + `npx biome check`.

---

## 🔷 FASE 1 — Foundation & Voting Backend Core

Urutan wajib (dependency berantai), kecuali yang ditandai ⚡ bisa paralel.

- [ ] **1. Install dependencies**
  ```bash
  pnpm add zod nodemailer react-fullscreen
  pnpm add -D vitest @types/nodemailer
  ```
  - [ ] `zod` — validasi input
  - [ ] `vitest` — unit test
  - [ ] `nodemailer` + types — kirim email (Fase 2, tapi install sekarang)
  - [ ] `react-fullscreen` — wrapper fullscreen (Fase 3)

- [ ] **2. `src/lib/env.ts`** — validasi env saat startup (fail-fast)
  - [ ] `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`
  - [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (App Password)
  - [ ] `SMTP_RATE_PER_MINUTE=100`, `SMTP_DAILY_CAP=1990`
  - [ ] `SCHOOL_NAME`, `VOTING_LOCATION`, `FROM_NAME` (email template)
  - [ ] Throw error jelas kalau ada yang kurang

- [ ] **3. `src/lib/vote/errors.ts`** — error contract terpusat
  - [ ] `VoteError` class + `isVoteError()`
  - [ ] 13 kode: `TOKEN_INVALID`, `TOKEN_ALREADY_USED`, `TOKEN_LOCKED`, `ELECTION_NOT_FOUND`, `ELECTION_NOT_STARTED`, `ELECTION_ENDED`, `ALREADY_VOTED`, `CANDIDATE_NOT_FOUND`, `NO_VOTE_SESSION`, `RATE_LIMITED`, `VOTER_NOT_ELIGIBLE`, `INVALID_INPUT`, `EMAIL_SEND_FAILED`

- [ ] **4. `src/lib/vote/schemas.ts`** — zod
  - [ ] `verifyTokenSchema`: 8 digit, terima `48219037` atau `4821-9037`, simpan normalized
  - [ ] `castVoteSchema`: candidate_id uuid

- [ ] **5. `src/lib/vote/session.ts`** — cookie vote session
  - [ ] httpOnly, 1 jam, `secure` di production
  - [ ] `setVoteSession(token)` / `getVoteSession()` / `clearVoteSession()`

- [ ] **6. `src/lib/utils/rate-limit.ts`** — anti bruteforce
  - [ ] Per-token cap: 5× salah → `TOKEN_LOCKED` (in-memory)
  - [ ] Global throttle: max 50 gagal/menit seluruh sistem
  - [ ] ❌ BUKAN per-IP (kiosk mode — 1 IP publik untuk semua laptop)

- [ ] ⚡ **7. `src/lib/utils/format.ts`** — bebas dependency, bisa paralel
  - [ ] `formatToken("48219037") → "4821-9037"`
  - [ ] `normalizeToken("4821-9037") → "48219037"` (buang dash/spasi)
  - [ ] `formatDate()` / `formatTime()` (buat email + admin)

- [ ] **8. `src/lib/vote/service.ts`** — ⭐ inti business logic (pure, testable)
  - [ ] `getActiveElection()` — election aktif sesuai waktu
  - [ ] `verifyToken(token)` — cek valid + lock check + eligible role check
  - [ ] `getCandidates(electionId)`
  - [ ] `castVote(token, candidateId)` — transaction atomic:
    ```prisma
    updateMany({ where: { token_id, is_used: false }, data: { is_used: true } })
    vote.create({ data: { election_id, voter_id: token.voter_id, candidate_id } })
    ```
  - [ ] Cek: token valid, belum dipakai, election aktif, kandidat valid, role eligible

- [ ] **9. `src/app/actions/voting.ts`** — server actions
  - [ ] `verifyTokenAction(input)` — 4-langkah pattern (zod → service → error contract → redirect)
  - [ ] `castVoteAction(input)` — sama, redirect ke `/success`
  - [ ] `revalidatePath` setelah mutasi

- [ ] ⚡ **10. `src/proxy.ts`** — proteksi admin (Next 16, pengganti middleware.ts)
  - [ ] Matcher: `/admin/:path*`
  - [ ] Session check → redirect `/login` kalau belum login
  - [ ] `proxy.ts` di root `src/`, bukan `middleware.ts`

- [ ] **11. `prisma/seed.ts`** — data test
  - [ ] 1 election aktif
  - [ ] 2 kandidat (Figma: Aditya Rahman XI RPL 7, Fawaz XI RPL 7)
  - [ ] 5 voter (role campuran) + 5 token 8-digit unik
  - [ ] `npx prisma migrate dev` jalan dulu sebelum seed

- [ ] **12. Vitest setup + unit test** — ✅ DoD Fase 1
  - [ ] `vitest.config.ts`
  - [ ] Test: `service.ts` (verify/cast flow, double-vote, token bekas, election mati)
  - [ ] Test: `format.ts` (formatToken, normalizeToken)
  - [ ] Test: `schemas.ts` (token dengan/tanpa dash, invalid)
  - [ ] **DoD:** `tsc` 0 error · `biome check` clean · test hijau · seed jalan
  - [ ] Manual flow: token valid → vote → success; token bekas ditolak; double-vote ditolak; election mati ditolak; rate limit aktif

---

## 🔷 FASE 2 — Admin Panel, Email & Bobot Suara

- [ ] **13. Schema update + migrate**
  - [ ] `Election.eligible_roles Role[] @default([SISWA])`
  - [ ] `Election.is_weighted Boolean @default(false)` + `Election.role_weights Json?`
  - [ ] `Vote.voter_id` FK ke Voter (Hybrid — tersimpan, gak pernah di UI)
  - [ ] `VoteToken.email_sent_at` + `email_error`
  - [ ] `EmailLog` model (SENT / FAILED / RESEND / NO_EMAIL)
  - [ ] `@@unique([voter_id, election_id])` di Vote + VoteToken
  - [ ] `npx prisma migrate dev`

- [ ] **14. Backend admin + email**
  - [ ] `lib/admin/service.ts` — CRUD election (eligible_roles + role_weights), candidate, voter
  - [ ] `lib/admin/tokens.ts` — generateTokens(electionId): filter eligible_roles, skip yg sudah punya token, crypto 8-digit
  - [ ] `lib/admin/weights.ts` — skor terbobot Opsi B: `Σ ((vote_grup / total_grup) × bobot_grup)` + validasi total 100%
  - [ ] `lib/email/service.ts` — Nodemailer + SMTP Workspace: 1 email = 1 token, delay 100/menit, cap 1.990/hari (queue lanjut besok), retry 2×, catat EmailLog
  - [ ] `lib/email/templates/token-email.ts` — pure builder → `{ subject, html, text }`:
    - table-based + inline styles (Gmail)
    - banner peach + nama sekolah (dari env, ZERO domain hardcoded)
    - token box monospace `XXXX-XXXX` · 3 langkah voting · footer panitia
    - versi text/plain · escaping HTML
  - [ ] `app/actions/admin.ts` — CRUD + `generateAndSendTokensAction` + `resendTokenEmailAction` + `editVoterEmailAction` + `resendAllAction`

- [ ] **15. Admin UI + Excel**
  - [ ] `(auth)/login/page.tsx` — Google OAuth
  - [ ] `(protected)/admin/layout.tsx` — session check + Sidebar
  - [ ] `dashboard/page.tsx` — statistik + raw & weighted
  - [ ] `elections/page.tsx` — CRUD + RolePicker + WeightInput + generate & kirim token
  - [ ] `candidates/page.tsx` — CRUD kandidat
  - [ ] `voters/page.tsx` — daftar + import Excel + email monitoring (filter SENT/FAILED/NO_EMAIL, aksi Edit/Resend/Print)
  - [ ] `lib/excel/service.ts` — SheetJS: import pemilih + export recap + export token (fallback cetak)
  - [ ] Pagination `take/skip` semua list
  - [ ] **DoD:** login email sekolah · CRUD lengkap · generate+kirim token jalan · skip email gagal (batch lanjut) · edit email → resend · laporan batch (295 SENT, 5 FAILED, 2 NO_EMAIL) · bobot 100% tervalidasi · raw + weighted tampil · import Excel rollback on error

---

## 🔷 FASE 3 — Public UI (anti-slop breakdown)

> Satu halaman = komposisi 4–7 komponen kecil. Tidak ada file raksasa.

- [ ] **16. Public UI + kiosk mode**
  - [ ] `app/page.tsx` (root, layout BEBAS) — landing:
    - `HeroSection` + `BrandLogo` + `CtaButton`
    - `FullscreenWrapper` (react-fullscreen) + `FullscreenButton`
    - `FullscreenGuard` — dialog peringatan saat keluar fullscreen (alert-dialog shadcn)
  - [ ] `(public)/layout.tsx` — layout kiosk: logo + `StepProgress` (3 dot), `cache-control: no-store`
  - [ ] `(public)/verify/page.tsx` — `StepProgress` + `TokenForm` (`OtpInput` 2 grup + separator `-`, `ErrorAlert`)
  - [ ] `(public)/vote/page.tsx` — `StepProgress` + `CandidateGrid` + `CandidateCard` + `VisionMissionDialog` + `ConfirmDialog`
  - [ ] `(public)/success/page.tsx` — `StepProgress` + `SuccessHeading` + `BackHomeButton` (auto-redirect 8 dtk)
  - [ ] Semua navigasi pakai `router.replace` (bukan push) — anti tombol Back
  - [ ] `clearVoteSession()` setelah vote sukses
  - [ ] **DoD:** match Figma (#00373e, #f9e6d0, radius 70/24/16, shadow OTP) · mobile responsive · error UI sesuai kode error · skeleton loading · OTP auto-focus + paste

---

## 🔷 FASE 4 — Analytics & Polish

- [ ] **17. Dashboard + realtime + perf**
  - [ ] Dashboard charts: `chart.js` + `react-chartjs-2` (donut + bar perolehan)
  - [ ] **Realtime scoreboard** — live persentase kandidat 1 vs 2 (polling/SSE), agregat anonim, untuk layar ruangan
  - [ ] Export recap: 2 sheet (hasil suara + audit partisipasi)
  - [ ] Testing lengkap: service, tokens, excel parser
  - [ ] Performance: `revalidatePath` semua mutasi · audit bundle · LCP check
  - [ ] **DoD:** scoreboard live jalan di layar ruangan · charts akurat (raw + weighted) · export Excel rapi · bundle ≤ target · LCP < 2.5s

---

## 📌 Aturan kerja

- **Jangan pernah** `git checkout` file yang belum di-commit (kayak `src/lib/db.ts` — pernah kehapus!)
- Baca file dulu sebelum overwrite (`db.ts` udah ada PrismaPg adapter)
- Tiap selesai task: `npx tsc --noEmit` + `npx biome check`
- Migrate: `npx prisma migrate dev` (bukan `db push` untuk schema final)
- Error baru → tambah ke `lib/vote/errors.ts`, jangan hardcode string