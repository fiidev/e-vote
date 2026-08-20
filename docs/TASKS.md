# ✅ TASK LIST — E-PILKETOS 2.0

> Source of truth: `docs/FINAL_PLAN.md` — baca dulu sebelum mulai.
> Checklist: centang `[x]` kalau udah selesai. Verifikasi tiap task: `npx tsc --noEmit` + `npx biome check`.

---

## 🔷 FASE 1 — Foundation & Voting Backend Core

Urutan wajib (dependency berantai), kecuali yang ditandai ⚡ bisa paralel.

- [x] **1. Install dependencies**
  ```bash
  pnpm add zod nodemailer react-fullscreen
  pnpm add -D vitest @types/nodemailer
  ```
  - [x] `zod` — validasi input
  - [x] `vitest` — unit test
  - [x] `nodemailer` + types — kirim email (Fase 2, tapi install sekarang)
  - [x] `react-fullscreen` — wrapper fullscreen (Fase 3)

- [x] **2. `src/lib/env.ts`** — validasi env saat startup (fail-fast)
  - [x] `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`
  - [x] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (App Password)
  - [x] `SMTP_RATE_PER_MINUTE=100`, `SMTP_DAILY_CAP=1990`
  - [x] `SCHOOL_NAME`, `VOTING_LOCATION`, `FROM_NAME` (email template)
  - [x] Throw error jelas kalau ada yang kurang

- [x] **3. `src/lib/vote/errors.ts`** — error contract terpusat
  - [x] `VoteError` class + `isVoteError()`
  - [x] 13 kode: `TOKEN_INVALID`, `TOKEN_ALREADY_USED`, `TOKEN_LOCKED`, `ELECTION_NOT_FOUND`, `ELECTION_NOT_STARTED`, `ELECTION_ENDED`, `ALREADY_VOTED`, `CANDIDATE_NOT_FOUND`, `NO_VOTE_SESSION`, `RATE_LIMITED`, `VOTER_NOT_ELIGIBLE`, `INVALID_INPUT`, `EMAIL_SEND_FAILED`

- [x] **4. `src/lib/vote/schemas.ts`** — zod
  - [x] `verifyTokenSchema`: 8 digit, terima `48219037` atau `4821-9037`, simpan normalized
  - [x] `castVoteSchema`: candidate_id uuid

- [x] **5. `src/lib/vote/session.ts`** — cookie vote session
  - [x] httpOnly, 1 jam, `secure` di production
  - [x] `setVoteSession(token)` / `getVoteSession()` / `clearVoteSession()`

- [x] **6. `src/lib/utils/rate-limit.ts`** — anti bruteforce
  - [x] Per-token cap: 5× salah → `TOKEN_LOCKED` (in-memory)
  - [x] Global throttle: max 50 gagal/menit seluruh sistem
  - [x] ❌ BUKAN per-IP (kiosk mode — 1 IP publik untuk semua laptop)

- [x] ⚡ **7. `src/lib/utils/format.ts`** — bebas dependency, bisa paralel
  - [x] `formatToken("48219037") → "4821-9037"`
  - [x] `normalizeToken("4821-9037") → "48219037"` (buang dash/spasi)
  - [x] `formatDate()` / `formatTime()` (buat email + admin)

- [x] **8. `src/lib/vote/service.ts`** — ⭐ inti business logic (pure, testable)
  - [x] `getActiveElection()` — election aktif sesuai waktu
  - [x] `verifyToken(token)` — cek valid + lock check + eligible role check
  - [x] `getCandidates(electionId)`
  - [x] `castVote(token, candidateId)` — transaction atomic:
    ```prisma
    updateMany({ where: { token_id, is_used: false }, data: { is_used: true } })
    vote.create({ data: { election_id, voter_id: token.voter_id, candidate_id } })
    ```
  - [x] Cek: token valid, belum dipakai, election aktif, kandidat valid, role eligible

- [x] **9. `src/app/actions/voting.ts`** — server actions
  - [x] `verifyTokenAction(input)` — 4-langkah pattern (zod → service → error contract → redirect)
  - [x] `castVoteAction(input)` — sama, redirect ke `/success`
  - [x] `revalidatePath` setelah mutasi

- [x] ⚡ **10. `src/proxy.ts`** — proteksi admin (Next 16, pengganti middleware.ts)
  - [x] Matcher: `/admin/:path*` + `/api/admin/:path*`
  - [x] Session check → redirect `/login` kalau belum login
  - [x] `proxy.ts` di root `src/`, bukan `middleware.ts`

- [x] **11. `prisma/seed.ts`** — data test
  - [x] 1 election aktif
  - [x] 2 kandidat (Figma: Aditya Rahman XI RPL 7, Fawaz XI RPL 7)
  - [x] 5 voter (role campuran) + 5 token 8-digit unik
  - [x] `npx prisma migrate dev` jalan dulu sebelum seed

- [x] **12. Vitest setup + unit test** — ✅ DoD Fase 1
  - [x] `vitest.config.ts`
  - [x] Test: `service.ts` (verify/cast flow, double-vote, token bekas, election mati)
  - [x] Test: `format.ts` (formatToken, normalizeToken)
  - [x] Test: `schemas.ts` (token dengan/tanpa dash, invalid)
  - [x] **DoD:** `tsc` 0 error · `biome check` clean · test hijau · seed jalan
  - [x] Manual flow: token valid → vote → success; token bekas ditolak; double-vote ditolak; election mati ditolak; rate limit aktif

---

## 🔷 FASE 2 — Admin Panel, Email & Bobot Suara

- [x] **13. Schema update + migrate**
  - [x] `Election.eligible_roles Role[] @default([SISWA])`
  - [x] `Election.is_weighted Boolean @default(false)` + `Election.role_weights Json?`
  - [x] `Vote.voter_id` FK ke Voter (Hybrid — tersimpan, gak pernah di UI)
  - [x] `VoteToken.email_sent_at` + `email_error`
  - [x] `EmailLog` model (SENT / FAILED / RESEND / NO_EMAIL)
  - [x] `@@unique([voter_id, election_id])` di Vote + VoteToken
  - [x] `npx prisma migrate dev`

- [x] **14. Backend admin + email**
  - [x] `lib/admin/service.ts` — CRUD election (eligible_roles + role_weights), candidate, voter
  - [x] `lib/admin/tokens.ts` — generateTokens(electionId): filter eligible_roles, skip yg sudah punya token, crypto 8-digit
  - [x] `lib/admin/weights.ts` — skor terbobot Opsi B: `Σ ((vote_grup / total_grup) × bobot_grup)` + validasi total 100%
  - [x] `lib/email/service.ts` — Nodemailer + SMTP Workspace: 1 email = 1 token, delay 100/menit, cap 1.990/hari (queue lanjut besok), retry 2×, catat EmailLog
  - [x] `lib/email/templates/token-email.ts` — pure builder → `{ subject, html, text }`:
    - table-based + inline styles (Gmail)
    - banner peach + nama sekolah (dari env, ZERO domain hardcoded)
    - token box monospace `XXXX-XXXX` · 3 langkah voting · footer panitia
    - versi text/plain · escaping HTML
  - [x] `app/actions/admin.ts` — CRUD + `generateAndSendTokensAction` + `resendTokenEmailAction` + `editVoterEmailAction` + `resendAllAction`

- [x] **15. Admin UI + Excel**
  - [x] `(auth)/login/page.tsx` — Google OAuth
  - [x] `(protected)/admin/layout.tsx` — session check + Sidebar
  - [x] `dashboard/page.tsx` — statistik + raw & weighted
  - [x] `elections/page.tsx` — CRUD + RolePicker + WeightInput + generate & kirim token
  - [x] `candidates/page.tsx` — CRUD kandidat
  - [x] `voters/page.tsx` — daftar + import Excel + email monitoring (filter SENT/FAILED/NO_EMAIL, aksi Edit/Resend/Print)
  - [x] `lib/excel/service.ts` — SheetJS: template download + import pemilih + export recap + export token (fallback cetak) — **kontrak kolom: `Nama` · `Email` · `Role` · `Angkatan` (lihat FINAL_PLAN §4.2)**
  - [x] Pagination `take/skip` semua list
  - [x] **DoD:** login email sekolah · CRUD lengkap · generate+kirim token jalan · skip email gagal (batch lanjut) · edit email → resend · laporan batch (295 SENT, 5 FAILED, 2 NO_EMAIL) · bobot 100% tervalidasi · raw + weighted tampil · import Excel rollback on error

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