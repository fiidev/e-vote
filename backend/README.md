# E-Vote Go High-Performance Microservice

Microservice backend berperforma tinggi berbasis **Golang (Fiber fasthttp)** dan **pgxpool** untuk sistem e-voting pemilihan ketua OSIS/organisasi. Dirancang untuk menangani lonjakan **3.000+ pemilih bersamaan (concurrent voters)** dengan memori ultra-efisien (~15-20 MB RAM) dan throughput **>15.000 req/s**.

---

## 🚀 Fitur Utama

- **Zero-Allocation HTTP Engine**: Dibangun di atas Go Fiber v2 (`fasthttp`) yang mengeksekusi request dalam hitungan sub-milidetik.
- **Atomic Double-Vote Prevention**: Proteksi balapan transaksi (race condition) menggunakan conditional update atomic:
  ```sql
  UPDATE vote_tokens SET is_used = true, used_at = $1 WHERE token_id = $2 AND is_used = false;
  ```
- **In-Memory Sliding Window Rate Limiter**: Memblokir serangan brute force token dan throttling global otomatis tanpa membebani database.
- **In-Memory Election Cache**: Metadata pemilihan aktif dan kandidat di-cache dalam RAM dengan sync RW-lock (TTL 60 detik) untuk waktu respon < 1 ms.
- **Real-Time Live Count Stream (SSE)**: Server-Sent Events (SSE) dengan pub/sub internal goroutine, menyiarkan perolehan suara ke dashboard secara instan tanpa polling database.
- **Seamless Next.js Integration**: Terintegrasi langsung dengan Next.js melalui internal private network (`http://backend-go.railway.internal:8080`) atau proxy rewrites `/api/v1/*`.

---

## 📡 Endpoint API (`/api/v1`)

| Method | Endpoint | Deskripsi | Status |
|---|---|---|---|
| `GET` | `/healthz` | Health check liveness & uptime | 200 OK |
| `POST` | `/api/v1/auth/verify` | Verifikasi token voting & buat sesi (JWT/Cookie) | 200 / 400 / 429 |
| `GET` | `/api/v1/elections/active` | Ambil data pemilihan aktif & daftar kandidat (RAM cache) | 200 / 404 |
| `POST` | `/api/v1/votes` | Kirim suara secara atomik (dual support: JWT cookie / raw token) | 200 / 400 / 429 |
| `GET` | `/api/v1/live-count` | Snapshot agregasi suara pemilihan (`?election_id=...`) | 200 OK |
| `GET` | `/api/v1/live-stream` | Real-time SSE stream suara masuk (`?election_id=...`) | 200 Event Stream |
| `POST` | `/api/v1/admin/elections/invalidate-cache` | Invalidate cache pemilihan di memori | 200 OK |

---

## ⚙️ Variabel Lingkungan (.env)

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `8080` | Port server Go |
| `DATABASE_URL` | - | PostgreSQL Connection String (Railway internal / external) |
| `BETTER_AUTH_SECRET` / `JWT_SECRET` | - | Kunci rahasia signing JWT session |
| `CORS_ORIGIN` | `*` | Origin domain frontend Next.js yang diizinkan |
| `RATE_LIMIT_TOKEN_MAX` | `5` | Maksimum percobaan gagal per token sebelum dikunci |
| `RATE_LIMIT_GLOBAL_MAX` | `2000` | Maksimum percobaan gagal global per menit sebelum throttling |

---

## 🛠️ Menjalankan Lokal

```bash
cd backend

# Download dependencies
go mod download

# Menjalankan unit tests
go test -v ./...

# Menjalankan server lokal
PORT=8080 DATABASE_URL="postgresql://user:password@localhost:5432/evote" go run ./cmd/api
```

---

## 🚢 Panduan Deploy di Railway (Multi-Service Rp 0)

1. **Buka Project Railway** yang sudah berisi database PostgreSQL dan service Next.js.
2. Klik tombol **+ New** -> **GitHub Repo** -> Pilih repo `e-vote`.
3. Masuk ke **Settings** service baru tersebut:
   - **Service Name**: Ganti menjadi `backend-go`.
   - **Root Directory**: Isi dengan `/backend`.
   - **Builder**: Pilih `Dockerfile` (Railway akan otomatis mendeteksi `backend/Dockerfile`).
4. Masuk ke **Variables** service `backend-go`:
   - `DATABASE_URL`: Isi `${{Postgres.DATABASE_URL}}` (menggunakan Reference Variable internal Railway).
   - `BETTER_AUTH_SECRET`: Isi `${{web.BETTER_AUTH_SECRET}}`.
   - `PORT`: `8080`.
5. Masuk ke **Variables** service `web` (Next.js):
   - Tambahkan variabel baru: `GO_BACKEND_URL` dengan nilai `http://backend-go.railway.internal:8080`.
6. Deploy! Next.js dan Go backend sekarang berkomunikasi lewat jaringan internal berkecepatan tinggi tanpa kuota bandwidth internet.
