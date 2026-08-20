# 📋 FINAL PLAN — E-PILKETOS 2.0

**Sistem Voting Elektronik Pemilihan Ketua OSIS — SMK Telkom Malang**
Next.js 16 · TypeScript · PostgreSQL · Prisma 7 · Better Auth (Google OAuth) · Token OTP 8 Digit (XXXX-XXXX)

---

## 0. Ringkasan

| Item | Keputusan |
|---|---|
| **Token voter** | 8 digit numerik, display format `XXXX-XXXX`, single-use, election-scoped |
| **Auth admin** | Better Auth + Google OAuth, whitelist email + domain sekolah |
| **Anonimitas suara** | **Hybrid** — `Vote.voter_id` tersimpan di DB (rekonsiliasi panitia), TIDAK PERNAH ditampilkan di UI |
| **Bobot suara** | Opsi B (normalisasi grup) — `is_weighted` + `role_weights`, validasi total 100% |
| **Eligible voters** | `Election.eligible_roles` — pilih role yang boleh vote per election |
| **Distribusi token** | SMTP Workspace sekolah (gratis) — delay 100/menit, daily cap 1.990, split H-2/H-1/Hari-H + fallback cetak Excel/PDF |
| **Realtime display** | Persentase kandidat 1 vs 2 (live scoreboard) — agregat anonim |
| **Anti double-vote** | Transaction atomic + `@@unique([voter_id, election_id])` + conditional update |
| **Arsitektur** | Route groups `(public)` + `admin`, proxy proteksi (Next 16), RSC-first |
| **Quality** | Zod validation · Biome lint · vitest · error contract terpusat |

---

## 1. Token OTP — Desain & Keamanan

### 1.1 Format

```
Input UI     : ▢▢▢▢ — ▢▢▢▢        (2 grup, separator dash)
Normalisasi  : 48219037             (8 digit murni, disimpan di DB)
Display      : 4821-9037            (dash hanya untuk tampilan)
```

### 1.2 Kenapa 8 digit `XXXX-XXXX`?

| Aspek | 6 digit (`123456`) | 8 digit (`4821-9037`) |
|---|---|---|
| Ruang kombinasi | 1.000.000 | **100.000.000** (100×) |
| Brute-force per tebakan | 1:1 juta | **1:100 juta** |
| Kemudahan baca | rawan typo | **Chunking 4-4** (aturan 7±2) |
| Deteksi error | lambat | grup bikin typo ketahuan cepat |

### 1.3 Aturan Penyimpanan

- DB menyimpan **8 digit tanpa dash** (`@unique`)
- Dash hanya dipakai di layer UI (formatter/parser)
- Normalisasi & validasi di **zod schema**: terima `48219037` atau `4821-9037`, simpan normalized
- Generator: `crypto.randomInt(0, 100_000_000)` → pad ke 8 digit → cek unik

### 1.4 Proteksi Bruteforce (Kiosk Mode — laptop panitia, bukan device siswa)

> **Konteks:** voting dilakukan di ruangan dengan beberapa laptop yang disediakan sekolah.
> Semua laptop satu IP publik → rate limit per-IP TIDAK cocok (lockout berantai).

| Layer | Mekanisme | Keterangan |
|---|---|---|
| 1 | 8-digit token (100 juta kombinasi) | Benteng utama |
| 2 | **Per-token attempt cap**: 5× salah → token di-lock | Cuma siswa yg bersangkutan kena, tidak menyebar |
| 3 | **Global throttle**: max 50 percobaan gagal/menit (seluruh sistem) | Nangkep distributed brute-force dari ruangan |
| 4 | Supervised room (panitia mengawasi + token dibagikan fisik) | Faktor manusia |

Kode error `TOKEN_INVALID` & `TOKEN_ALREADY_USED` tidak membedakan validitas (anti-enumeration).

### 1.5 Kiosk Mode — Operasional (wajib)

| Aturan | Implementasi |
|---|---|
| Auto-reset antar siswa | Success page redirect ke landing otomatis setelah 8 detik (+ tombol manual) |
| Tanpa jejak browser | `router.replace` (bukan push) — tombol Back tidak bisa balik ke voting |
| Bersihkan sesi | `clearVoteSession()` setelah vote sukses |
| Fullscreen (interaktif) | Button "Fullscreen" di landing → `requestFullscreen()` (MVP: fitur ini jalan duluan, fitur lain menyusul) |
| Exit-fullscreen guard | Listener `fullscreenchange` → jika keluar fullscreen, muncul **dialog peringatan** untuk kembali ke fullscreen (cancel = keluar app) |
| No cache | Halaman voting pakai `cache-control: no-store` |

**Komponen terkait (Fase 3):**
- `components/public/FullscreenWrapper.tsx` — wrapper fullscreen (library React, misal `react-fullscreen` atau native Fullscreen API) — trigger di landing (root page)
- `components/public/FullscreenButton.tsx` — tombol trigger fullscreen di landing
- `components/public/FullscreenGuard.tsx` — client component, listen `fullscreenchange`, render dialog peringatan saat keluar fullscreen

---

## 2. Arsitektur Routing

```
app/
├── page.tsx                     # LANDING "Ayo Pilih" — root, layout BEBAS (BUKAN kiosk)
│                                #   FullscreenButton + FullscreenGuard + intro
├── (auth)/                      # Route Group Auth (tanpa sidebar admin)
│   └── login/page.tsx           # Google OAuth
│
├── (public)/                    # Route Group Voter — kiosk mode (layout kiosk)
│   ├── layout.tsx               # Layout kiosk: logo + StepProgress (no-store)
│   ├── verify/page.tsx          # OTP 8 digit (XXXX-XXXX)
│   ├── vote/page.tsx            # Grid kandidat + dialog visi-misi
│   └── success/page.tsx         # Closing "Suara kamu aman"
│
├── (protected)/admin/           # Route Group Admin — protected (proxy)
│   ├── layout.tsx               # Server session check + Sidebar
│   ├── dashboard/page.tsx       # Statistik + grafik
│   ├── elections/page.tsx       # CRUD election + generate token batch
│   ├── candidates/page.tsx      # CRUD kandidat
│   └── voters/page.tsx          # Import Excel + daftar pemilih
│
├── api/
│   └── auth/[...all]/route.ts   # Better Auth handler
│
└── actions/                     # ⭐ Server actions terpusat (Fase 1)
    ├── voting.ts                # verifyToken, castVote
    ├── admin.ts                 # CRUD election/candidate/voter, generateTokens
    └── voter-excel.ts           # import/export Excel

proxy.ts                         # Proteksi /admin/* (session check → redirect login) — Next 16
```

> **Kenapa landing di root, bukan di `(public)`?** Landing = layout BEBAS (intro + fullscreen button + guard), bukan layout kiosk. Setelah user trigger fullscreen & klik "Ayo Pilih", baru masuk `(public)` yang layout-nya kiosk (minimal, no-store, StepProgress). Route group tidak mengubah URL — `/` tetap landing.

---

## 3. Struktur `lib/` — Data Layer Berlapis

```
src/lib/
├── env.ts                       # ⭐ Validasi env saat startup (fail-fast)
├── db.ts                        # Prisma singleton + driver adapter (ada)
├── auth.ts / auth-client.ts     # Better Auth (ada, + domain check di Fase 2)
│
├── vote/
│   ├── errors.ts                # VoteError + kode error (contract)
│   ├── session.ts               # Cookie vote session (httpOnly, 1 jam)
│   ├── service.ts               # ⭐ Pure business logic (testable)
│   └── schemas.ts               # zod: verifyToken (8 digit), castVote (uuid)
│
├── admin/
│   ├── service.ts               # CRUD election/candidate/voter (pure)
│   ├── tokens.ts                # Generator token 8-digit aman (crypto)
│   └── weights.ts               # Skor terbobot Opsi B (normalisasi grup)
│
├── email/
│   └── service.ts               # Nodemailer — kirim token per voter, batch + retry
│
├── excel/
│   └── service.ts               # Parse/export .xlsx (SheetJS) — Fase 2
│
└── utils/
    ├── cn.ts                    # (ada)
    ├── rate-limit.ts            # Rate limiter (bruteforce token)
    └── format.ts                # formatToken (XXXX-XXXX), tanggal, dll
```

**Alur panggilan (satu arah):**
```
Server Action (app/actions/)
  → zod validasi (lib/vote/schemas)
  → service (lib/vote/service) — logic murni + DB
  → session/cookie (lib/vote/session)
  → redirect / return error code
```

---

## 4. ERD & Schema (final)

```
Voter 1───N VoteToken N───1 Election 1───N Candidate 1───N Vote
  │              │                            ▲
  │              └── 1 voter : max 1 token per election
  └─── N─── Vote (voter_id FK — Hybrid: tersimpan, tidak ditampilkan)
Election 1───N EmailLog (audit pengiriman token)
```

Catatan penting (sudah diterapkan / keputusan final):
- `Vote.voter_id` FK ke `Voter` → **Hybrid**: tersimpan untuk rekonsiliasi panitia, **tidak pernah dirender di UI** (dashboard/recap hanya agregat; data individu hanya via halaman audit admin)
- `@@unique([voter_id, election_id])` → 1 voter max 1 **token** per election (VoteToken) **dan** max 1 **vote** per election (Vote) — double proteksi
- `Election.eligible_roles Role[]` → role yang boleh vote, dipilih saat buat election
- `Election.is_weighted Boolean @default(false)` + `Election.role_weights Json?` → bobot per role, validasi total 100%
- `VoteToken.email_sent_at` + `VoteToken.email_error` → tracking pengiriman email
- `EmailLog` → audit trail pengiriman (SENT / FAILED / RESEND / NO_EMAIL) — status per item, gagal 1 email TIDAK menggagalkan batch

**Prinsip pengiriman email (per item, bukan per batch):**
- Generate & send adalah **2 fase terpisah** — email gagal TIDAK mempengaruhi token
- Gagal 1 email → **skip, lanjut yang lain** (295 voter valid tidak dikorbankan untuk 5 typo)
- Token tetap valid walau email gagal → cukup **resend**, tidak perlu generate ulang
- Auto-retry 2× sebelum status `FAILED`
- Typo email tidak bisa diperbaiki dengan resend → **✏️ Edit Email dulu, baru resend**

**Provider (default — GRATIS):** Google Workspace sekolah (SMTP)
- Delay **100 email/menit** (`SMTP_RATE_PER_MINUTE`)
- **Daily cap 1.990** (`SMTP_DAILY_CAP`, buffer 10 untuk resend) — queue otomatis lanjut di hari berikutnya kalau cap kena
- Pengiriman dipecah: **H-2** (batch besar) → **H-1** (sisa) → **Hari-H** (resend FAILED saja, kuota fresh)
- Akun khusus panitia + **App Password** (2FA) di env, bukan email pribadi

**Fallback (MVP):** cukup ganti env ke `smtp.resend.com` (Resend $20/bln, 50.000 email) — **kode sama, tanpa integrasi tambahan**
- `@@index([election_id])` & `@@index([candidate_id])` di `Vote`
- Better Auth model lengkap: `emailVerified`, `issuer`, `refreshToken`, `Verification` model

**Transaction `castVote` (atomic, anti race condition):**
```prisma
await db.$transaction(async (tx) => {
  const token = await tx.voteToken.findUnique({ where: { token_id } })
  // cek is_used + election aktif (start_time ≤ now ≤ end_time) + kandidat valid
  const updated = await tx.voteToken.updateMany({
    where: { token_id, is_used: false },    // ← conditional update = atomic lock
    data: { is_used: true, used_at: new Date() },
  })
  if (updated.count === 0) throw new VoteError("TOKEN_ALREADY_USED")
  await tx.vote.create({ data: { election_id, voter_id: token.voter_id, candidate_id } })
})
```

**Skor terbobot (Opsi B — kontribusi grup dinormalisasi):**

```
skor_kandidat = Σ_grup ( (vote_kandidat_di_grup / total_vote_grup) × bobot_grup )
```

- Role diambil dari join `Voter.role`
- `is_weighted=false` → hasil = raw count biasa
- Dashboard selalu menampilkan **dua angka**: suara mentah (raw) + skor terbobot (weighted) → transparan

### 4.1 Template Email Token

**Keputusan desain (anti-slop, tanpa gambar):**
- Table-based layout + **inline styles** (Gmail buang `<style>` & CSS class — Tailwind/CSS vars tidak berlaku)
- **Tanpa logo/gambar eksternal** — header = banner peach dengan teks nama sekolah
- Wajib versi **text/plain** (skor spam + aksesibilitas)
- Warna design tokens → **hex inline** (email tidak kenal CSS variable)
- **ZERO domain hardcoded** — semua dari env: `SCHOOL_NAME`, `VOTING_LOCATION`, `FROM_NAME`
- Token TIDAK pernah di subject line (anti-bocor + anti-spam)

**Struktur file (pure function, testable):**
```
lib/email/
├── service.ts              # Nodemailer + queue + cap harian
├── tokens.ts               # reuse formatToken() dari utils
└── templates/
    └── token-email.ts      # PURE → { subject, html, text }
                            # input: { voterName, tokenCode, election, config }
```

**Builder render (komposisi fungsi kecil, bukan 1 string raksasa):**
```
buildLayout(children)   → wrapper table (bg surface #f7f6f4)
buildHeader()           → banner peach (#f9e6d0): nama sekolah + judul
buildTokenBox(token)    → kotak peach, monospace, letter-spacing, format XXXX-XXXX
buildSteps(steps[])     → 3 langkah bernomor
buildFooter()           → "Panitia Pilketos" (tanpa domain)
```

**Konten (Bahasa Indonesia full):**
```
Subject : "Kode Voting Pilketos — Jangan Dibagikan"

Hai [nama voter],
Ini kode voting kamu: [ 4821-9037 ]
⚠️ RAHASIA — sekali pakai, jangan dibagikan.
Cara voting:
1. Datang ke [VOTING_LOCATION]
2. Masuk ke laptop yang disediakan
3. Masukkan kode, pilih kandidat, selesai
Voting: [start] – [end]
Panitia Pilketos
```

**Mapping token → hex (inline):** ink `#00373e` (teks) · ink-muted `#5c6f6c` (footer) · surface `#f7f6f4` (bg) · peach `#f9e6d0` (banner + token box) · line `#e4e4e4` (border)

**✅ DoD template:** render benar di Gmail · versi text/plain ada · token monospace besar format `XXXX-XXXX` · escaping HTML (nama voter berisi `<`/`&` tidak merusak layout) · zero domain hardcoded · vitest snapshot render

### 4.2 Template Excel Import Pemilih (kontrak kolom — PENTING)

> Import butuh struktur `.xlsx` yang **persis sama** — template ini yang di-download dari halaman voters (Fase 2). Parser hanya menerima header persis berikut.

| Kolom (header baris 1) | Wajib? | Contoh | Validasi |
|---|---|---|---|
| `Nama` | ✅ | Budi Santoso | non-kosong |
| `Email` | ✅ | budi@student.smktelkom-mlg.sch.id | format email · unique di DB (duplikat → error baris itu) |
| `Role` | ❌ default `SISWA` | `SISWA` / `OSIS` / `MPK` / `GUKAR` | case-insensitive (trim + uppercase) · selain 4 nilai → error baris |
| `Angkatan` | ❌ | 33 / 34 / 35 | opsional, string 2 digit |

**Aturan file:**
- Baris 1 = header, baris 2+ = data. Header selain kontrak di atas → tolak seluruh file (fail-fast, bukan per-baris).
- Import = buat `Voter` **sekaligus generate token** (tiap voter wajib punya token) — transaksi tunggal, **rollback semua kalau ada 1 baris error** (tidak ada partial import).
- Sheet name: `Pemilih`. Kolom di luar 4 header diabaikan (mis. catatan panitia).
- Template disediakan berisi header + **1 baris contoh** (baris 2) yang harus dihapus — contoh ditandai agar tidak lolos: `Nama` = "Contoh Nama", `Email` = "contoh@email.com" (parser menolak jika `Nama`/`Email` berisi kata "contoh" → tidak akan pernah masuk DB).
- Download template: route GET `api/admin/voters/template` (dilindungi proxy) → `.xlsx` (SheetJS). Button di `voters/page.tsx`.

**✅ DoD template Excel:** vitest: header pas kontrak → parse ok · header salah → tolak file · role lowercase/trim → normalisasi · email duplikat dalam file → error + rollback · 1 baris error → semua tidak masuk.

---

## 5. Error Contract (terpusat)

```
TOKEN_INVALID          → token 8 digit tidak ditemukan
TOKEN_ALREADY_USED     → token sudah dipakai
ELECTION_NOT_FOUND     → tidak ada election aktif
ELECTION_NOT_STARTED   → voting belum dimulai
ELECTION_ENDED         → voting sudah selesai
ALREADY_VOTED          → voter sudah vote
CANDIDATE_NOT_FOUND    → kandidat tidak ada di election ini
NO_VOTE_SESSION        → akses halaman tanpa token
RATE_LIMITED           → terlalu banyak percobaan
TOKEN_LOCKED           → token di-lock (5× percobaan gagal)
VOTER_NOT_ELIGIBLE     → voter tidak termasuk eligible_roles election ini
INVALID_INPUT          → input gagal validasi zod
EMAIL_SEND_FAILED      → pengiriman email token gagal
```

---

## 6. Fase Eksekusi + Definition of Done

### 🔷 FASE 1 — Foundation & Voting Backend Core

| Deliverable | Detail |
|---|---|
| `lib/env.ts` | Validasi `DATABASE_URL`, `GOOGLE_*`, `ADMIN_EMAILS` — throw jika kurang |
| `lib/vote/errors.ts` | 10 kode error + `VoteError` class + `isVoteError()` |
| `lib/vote/schemas.ts` | zod: token 8 digit (terima dash), castVote (uuid) |
| `lib/vote/session.ts` | httpOnly cookie, 1 jam, `secure` di production, `clearVoteSession()` |
| `lib/vote/service.ts` | `getActiveElection`, `verifyToken`, `getCandidates`, `castVote` |
| `lib/utils/rate-limit.ts` | Per-token cap (5× lock) + global throttle (50 gagal/menit) — BUKAN per-IP |
| `lib/utils/format.ts` | `formatToken("48219037") → "4821-9037"` |
| `app/actions/voting.ts` | `verifyTokenAction`, `castVoteAction` |
| `proxy.ts` | Proteksi `/admin/*` (Next 16 — pengganti middleware.ts) |
| `prisma/seed.ts` | Election + 2 kandidat (Figma) + 5 voter + 5 token 8-digit |
| vitest setup | Unit test `service.ts`, `tokens.ts`, `format.ts` |

**✅ DoD:** `tsc` 0 error · Biome clean · unit test hijau · seed jalan · flow manual: token valid → vote → success; token bekas ditolak; double-vote ditolak; election mati ditolak; rate limit aktif.

### 🔷 FASE 2 — Admin Panel & Auth Hardening

| Deliverable | Detail |
|---|---|
| `lib/auth.ts` update | + domain check `@smktelkom-mlg.sch.id` (OR `ADMIN_EMAILS`) |
| `lib/admin/service.ts` | CRUD election (termasuk `eligible_roles` + `role_weights`), candidate, voter — pure + zod |
| `lib/admin/tokens.ts` | `generateTokens(electionId)` batch: filter voter by `eligible_roles`, skip yang sudah punya token, crypto 8-digit |
| `lib/email/service.ts` | Nodemailer + SMTP Workspace sekolah (gratis) — 1 email = 1 token, delay 100/menit (`SMTP_RATE_PER_MINUTE`), daily cap 1.990 (`SMTP_DAILY_CAP`, buffer resend), queue lanjut besok kalau cap kena, auto-retry 2×, status per item (SENT/FAILED/RESEND/NO_EMAIL), catat `EmailLog`. Fallback MVP: ganti env ke `smtp.resend.com` |
| `lib/email/templates/token-email.ts` | Template token (pure builder, inline styles, text/plain, zero domain hardcoded) |
| `lib/admin/weights.ts` | Skor terbobot Opsi B + validasi bobot total 100% |
| `app/actions/admin.ts` | CRUD + `generateAndSendTokensAction` + `resendTokenEmailAction` + `editVoterEmailAction` + `resendAllAction` |
| Email monitoring | Tabel status per voter (SENT/FAILED/NO_EMAIL) + filter "Belum terkirim"/"Gagal" + aksi ✏️ Edit Email → 📧 Resend · 🖨️ Print Token (fallback cetak) |
| Admin pages | login, dashboard (raw + weighted), elections (pilih role + bobot), candidates, voters |
| `components/admin/` | `Sidebar`, `DataTable`, `FormDialog`, `StatCard`, `RolePicker`, `WeightInput` |
| Pagination | `take/skip` di semua list admin |
| SheetJS | `lib/excel/service.ts` — template download (§4.2) + import pemilih + export recap + export token (fallback cetak) — struktur kolom terikat kontrak §4.2 |

**✅ DoD:** Login Google hanya email sekolah · CRUD lengkap · generate + kirim token per email jalan · **skip email gagal (batch tidak dibatalkan)** · **edit email (typo) → resend jalan** · **laporan akhir batch (295 SENT, 5 FAILED, 2 NO_EMAIL)** · export token (fallback cetak) · bobot total 100% tervalidasi · dashboard tampil raw + weighted · logout jalan · proxy redirect · import Excel dengan rollback on error.

### 🔷 FASE 3 — Public UI (anti-slop breakdown)

> Satu halaman = komposisi 4–7 komponen kecil. Tidak ada file raksasa.

| Page | Komponen |
|---|---|
| `app/page.tsx` (root — layout bebas) | `HeroSection` + `BrandLogo` + `CtaButton` + **`FullscreenWrapper`** (library) + **`FullscreenButton`** + **`FullscreenGuard`** (dialog peringatan saat keluar fullscreen) |
| `(public)/verify/page.tsx` | `StepProgress` + `TokenForm` (`OtpInput` 2 grup + separator, `ErrorAlert`) |
| `(public)/vote/page.tsx` | `StepProgress` + `CandidateGrid` + `CandidateCard` + `VisionMissionDialog` + `ConfirmDialog` |
| `(public)/success/page.tsx` | `StepProgress` + `SuccessHeading` + `BackHomeButton` |

Komponen shared: `components/vote/StepProgress` (3 dot — dari design Figma).

**✅ DoD:** Visual match Figma (warna `#00373e`, `#f9e6d0`, radius 70, shadow OTP) · mobile responsive · error UI sesuai kode error · skeleton loading · OTP auto-focus & paste support.

### 🔷 FASE 4 — Analytics & Polish

| Deliverable | Detail |
|---|---|
| Dashboard charts | `chart.js` + `react-chartjs-2` (donut + bar perolehan) |
| **Realtime scoreboard** | Live persentase kandidat 1 vs 2 (polling berkala / SSE) — agregat anonim, untuk layar ruangan |
| Export recap | 2 sheet: hasil suara + audit partisipasi |
| Testing lengkap | vitest: service, tokens, excel parser |
| Performance | `revalidatePath` semua mutasi · audit bundle · LCP check |

---

## 7. Konvensi Kode (kontrak tim)

```ts
// File & folder
kebab-case.tsx                    // file
PascalCase                        // komponen React
camelCase                         // function/variabel
CONSTANT_CASE                     // konstanta global

// Komponen
function Button() { }             // function declaration
"use client"                      // HANYA jika interaktif

// Server Action pattern (4 langkah wajib)
export async function castVoteAction(input: unknown) {
  const parsed = castVoteSchema.safeParse(input)    // 1. validasi
  if (!parsed.success) return { error: "INVALID_INPUT" }
  try {                                             // 2. service
    await voteService.castVote(parsed.data)
  } catch (e) {
    if (isVoteError(e)) return { error: e.code }    // 3. error contract
    throw e
  }
  revalidatePath("/vote")                           // 4. invalidasi cache
  redirect("/success")
}
```

Aturan tambahan:
- Zero `any`, zero non-null assertion (Biome enforce)
- Komponen dipakai >1 halaman → `components/shared/` atau `components/vote/`
- Komponen khusus 1 halaman → folder per halaman
- Semua query pakai RSC (server component), client hanya interaksi

---

## 8. Dependency (bertahap per fase)

| Dependency | Fase | Alasan |
|---|---|---|
| `zod` | 1 | Validasi input (standar industri) |
| `vitest` | 1 | Unit test service layer |
| `xlsx` (SheetJS, CDN resmi) | 2 | Template + import/export Excel — kontrak kolom §4.2 |
| `chart.js` + `react-chartjs-2` | 4 | Dashboard analytics |

---

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Race condition double-vote | `updateMany` conditional + `@@unique` |
| Brute-force token | 8 digit (100 juta) + per-token cap 5× + global throttle |
| Lockout berantai (1 IP kiosk) | Tanpa rate limit per-IP — pakai per-token & global throttle |
| Sisa sesi antar siswa (kiosk) | Auto-redirect 8 dtk + `router.replace` + `clearVoteSession` + no-store |
| Token bocor di URL/history | Token hanya di httpOnly cookie, tidak pernah di URL |
| Excel injection / format salah | zod + sanitasi + transaction rollback |
| Admin session expired | Middleware redirect + Better Auth updateAge |
| Token typo saat diketik | Format `XXXX-XXXX` chunking + auto-focus + paste support |
| Email gagal terkirim | Skip per item (batch tetap lanjut) · status FAILED di `EmailLog` · ✏️ Edit Email (typo) → 📧 Resend token yang sama · token TIDAK digenerate ulang |
| Kena limit harian Workspace (2.000/hari) | Daily cap 1.990 di config + queue lanjut otomatis di hari berikutnya · kirim dipecah H-2/H-1, resend di hari-H |
| SMTP mati total | Generate & send terpisah → token aman di DB, tinggal "Kirim Ulang Semua" · fallback MVP: ganti env ke `smtp.resend.com` |
| Voter tanpa email valid | Export token Excel/PDF (fallback cetak) |
| Sengketa hasil terbobot | Dashboard tampil raw + weighted · audit `EmailLog` · data individu di DB (hybrid) untuk rekonsiliasi |
| Tekanan sosial (hybrid) | Identitas TIDAK pernah dirender di UI publik — hanya halaman audit admin |

---

## 10. Referensi Design (Figma E-Pilketos)

- File: `aSTrWug2EldruuqFeEfZG6` — section "Final" (node `4057:1518`)
- Warna: ink `#00373e` · surface `#f7f6f4` · peach `#f9e6d0` · line `#e4e4e4`
- Radius: container 70px · card 24px · OTP 16px
- 4 halaman: Home → Token → Voting → Closing
- Sudah diimplementasikan di `globals.css` (design tokens) + 58 komponen shadcn