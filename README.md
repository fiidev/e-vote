# E-Pilketos — Platform Voting Digital OSIS

Platform pemilihan ketua OSIS, MPK, dan organisasi sekolah secara digital.
Dibangun dengan Next.js 16, Prisma 7, PostgreSQL, dan Better Auth.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js Server Actions, Prisma ORM 7, PostgreSQL
- **Auth**: Better Auth (Google OAuth), admin-only whitelist
- **Email**: Nodemailer, SMTP (Gmail/Google Workspace)
- **Real-time**: Server-Sent Events (SSE)
- **Testing**: Vitest, Biome (lint + format)

## Fitur

### Public (Voter)
- Landing page dengan branding sekolah
- Verifikasi token voting 8 digit (OTP input)
- Pemilihan kandidat dengan visi & misi
- Konfirmasi vote + halaman sukses
- Anti double-vote (atomic transaction + session cookie)

### Admin
- Dashboard ringkasan (pemilih, suara, token, email log)
- CRUD Pemilihan (jadwal, role eligible, sistem bobot)
- CRUD Kandidat (foto, visi, misi, nomor urut)
- CRUD Pemilih (manual + import Excel)
- Generate token 8 digit per pemilih
- Kirim token via email (batch + rate limit + daily cap)
- **Live Count** — real-time SSE tanpa polling
- Export token + template import Excel

## Getting Started

### Prasyarat

- Node.js 22+
- pnpm
- PostgreSQL 16 (lokal atau Prisma Postgres)

### Setup Development

```bash
# 1. Clone
git clone https://github.com/fiidev/e-vote.git
cd e-vote

# 2. Install dependencies
pnpm install

# 3. Copy & isi .env
cp .env.example .env
# Isi: DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SMTP_*, dll.

# 4. Generate Prisma client
pnpm prisma generate

# 5. Apply migration
pnpm prisma migrate dev

# 6. Seed data (opsional)
pnpm prisma db seed

# 7. Run
pnpm dev
```

Buka http://localhost:3000

### Testing

```bash
pnpm vitest run        # Unit test (90 tests)
pnpm biome check       # Lint
pnpm build             # Production build
```

## Deployment (Docker)

### 1. Siapkan .env

```bash
cp .env.example .env
# Isi SEMUA variabel:
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# - ADMIN_EMAILS (email admin, comma-separated)
# - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
# - SCHOOL_NAME, VOTING_LOCATION, FROM_NAME
# - NEXT_PUBLIC_APP_URL (http://IP_SERVER:3000)
# - BETTER_AUTH_URL (http://IP_SERVER:3000)
# - BETTER_AUTH_SECRET (random string, minimal 32 karakter)
```

### 2. Build & Run

```bash
# Build dan start semua service (app + postgres)
docker compose up -d

# Apply migration (pertama kali)
docker compose exec app npx prisma migrate deploy

# Seed data (opsional)
docker compose exec app npx prisma db seed
```

### 3. Akses

- App: `http://<IP_SERVER>:3000`
- Admin: `http://<IP_SERVER>:3000/admin/dashboard`

### 4. Update

```bash
git pull
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

## Struktur Proyek

```
src/
├── app/
│   ├── (auth)/login/        # Halaman login admin
│   ├── (protected)/admin/   # Dashboard, CRUD, Live Count
│   ├── actions/             # Server Actions (admin + voting)
│   ├── api/                 # API routes (SSE, export, template)
│   ├── verify/              # Halaman verifikasi token
│   ├── vote/                # Halaman pemilihan
│   └── success/             # Halaman sukses vote
├── components/
│   ├── admin/               # Komponen admin (table, form, sidebar)
│   ├── public/              # Komponen voter (card, verify, vote)
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── admin/               # Service, schema, token, weights
│   ├── email/               # Email service + template
│   ├── excel/               # Import/export Excel
│   ├── vote/                # Voting service, errors, session
│   └── utils/               # Format, rate-limit
├── generated/prisma/        # Prisma client (auto-generated)
└── types/                   # TypeScript types
```

## Env Variables

| Variable | Deskripsi |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Email admin (comma-separated) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / app password |
| `SCHOOL_NAME` | Nama sekolah |
| `VOTING_LOCATION` | Lokasi voting |
| `FROM_NAME` | Nama pengirim email |
| `NEXT_PUBLIC_APP_URL` | URL aplikasi |
| `BETTER_AUTH_URL` | Auth base URL |
| `BETTER_AUTH_SECRET` | Auth secret (min 32 char) |