package handlers

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/fiidev/e-vote-api/internal/config"
	"github.com/fiidev/e-vote-api/internal/middleware"
	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/fiidev/e-vote-api/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VoteHandler struct {
	pool             *pgxpool.Pool
	cfg              *config.Config
	rateLimiter      *middleware.RateLimiter
	liveCountService *services.LiveCountService
}

func NewVoteHandler(
	pool *pgxpool.Pool,
	cfg *config.Config,
	rl *middleware.RateLimiter,
	liveCount *services.LiveCountService,
) *VoteHandler {
	return &VoteHandler{
		pool:             pool,
		cfg:              cfg,
		rateLimiter:      rl,
		liveCountService: liveCount,
	}
}

type voteSubmitRequest struct {
	CandidateID string `json:"candidateId"`
	Token       string `json:"token,omitempty"`
}

func (h *VoteHandler) CastVote(c *fiber.Ctx) error {
	var req voteSubmitRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.CandidateID) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "INVALID_INPUT",
			Message: "Data yang dimasukkan tidak valid.",
		})
	}

	candidateID := strings.TrimSpace(req.CandidateID)
	rawToken := strings.TrimSpace(req.Token)

	var (
		tokenID    string
		voterID    string
		electionID string
	)

	// Cek apakah ada claims dari middleware ValidateSession
	claimsVal := c.Locals("claims")
	if claimsVal != nil {
		if claims, ok := claimsVal.(*models.VoteClaims); ok {
			tokenID = claims.TokenID
			voterID = claims.VoterID
			electionID = claims.ElectionID
		}
	}

	// Jika tidak ada session JWT, coba ambil via rawToken (fallback kompatibilitas Next.js form)
	if tokenID == "" {
		if rawToken == "" {
			// Cek header X-Vote-Token
			rawToken = c.Get("X-Vote-Token")
		}

		if rawToken == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
				Error:   "NO_VOTE_SESSION",
				Message: "Sesi memilih telah berakhir. Silakan masukkan token kembali.",
			})
		}
	}

	if h.rateLimiter.IsGloballyThrottled() {
		return c.Status(fiber.StatusTooManyRequests).JSON(models.ErrorResponse{
			Error:   "RATE_LIMITED",
			Message: "Terlalu banyak permintaan. Mohon tunggu beberapa saat.",
		})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	// Eksekusi transaksi database secara atomik
	tx, err := h.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal memulai transaksi voting.",
		})
	}
	defer tx.Rollback(ctx)

	// Jika session berasal dari raw token, verifikasi langsung di dalam transaksi
	if tokenID == "" {
		var isUsed bool
		var startTime, endTime time.Time
		var isActive bool

		qToken := `
			SELECT vt.token_id, vt.voter_id, vt.election_id, vt.is_used, e.start_time, e.end_time, e.is_active
			FROM vote_tokens vt
			JOIN elections e ON vt.election_id = e.election_id
			WHERE vt.token_code = $1
			FOR UPDATE OF vt
		`
		err := tx.QueryRow(ctx, qToken, rawToken).Scan(
			&tokenID,
			&voterID,
			&electionID,
			&isUsed,
			&startTime,
			&endTime,
			&isActive,
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
					Error:   "TOKEN_INVALID",
					Message: "Token tidak valid. Periksa kembali token Anda.",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
				Error:   "INTERNAL_ERROR",
				Message: "Gagal memverifikasi token.",
			})
		}

		if isUsed {
			return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
				Error:   "TOKEN_ALREADY_USED",
				Message: "Token ini sudah digunakan untuk memilih.",
			})
		}

		now := time.Now()
		if !isActive || now.Before(startTime) {
			return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
				Error:   "ELECTION_NOT_STARTED",
				Message: "Pemilihan belum dimulai.",
			})
		}
		if now.After(endTime) {
			return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
				Error:   "ELECTION_ENDED",
				Message: "Pemilihan sudah berakhir.",
			})
		}
	}

	// 1. Verifikasi kandidat sah dan terdaftar pada pemilihan ini
	var validCandID string
	qCand := `SELECT candidate_id FROM candidates WHERE candidate_id = $1 AND election_id = $2 LIMIT 1`
	if err := tx.QueryRow(ctx, qCand, candidateID, electionID).Scan(&validCandID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
				Error:   "CANDIDATE_NOT_FOUND",
				Message: "Kandidat tidak ditemukan.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal memvalidasi kandidat.",
		})
	}

	// 2. ATOMIC CLAIM: Update token is_used=true secara bersyarat WHERE is_used = false
	now := time.Now()
	qClaim := `
		UPDATE vote_tokens
		SET is_used = true, used_at = $1
		WHERE token_id = $2 AND is_used = false
	`
	cmdTag, err := tx.Exec(ctx, qClaim, now, tokenID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal mengklaim token suara.",
		})
	}
	if cmdTag.RowsAffected() == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "TOKEN_ALREADY_USED",
			Message: "Token ini sudah digunakan untuk memilih.",
		})
	}

	// 3. Catat surat suara ke tabel votes
	voteID := uuid.New().String()
	qInsertVote := `
		INSERT INTO votes (vote_id, election_id, voter_id, candidate_id, voted_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err = tx.Exec(ctx, qInsertVote, voteID, electionID, voterID, validCandID, now)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // Unique violation
			return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
				Error:   "ALREADY_VOTED",
				Message: "Anda sudah menggunakan hak suara Anda.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal menyimpan surat suara.",
		})
	}

	// 4. Commit transaksi
	if err := tx.Commit(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal menyelesaikan proses voting.",
		})
	}

	// 5. Bersihkan cookie vote_session
	isSecure := c.Protocol() == "https" || c.Get("X-Forwarded-Proto") == "https"
	c.Cookie(&fiber.Cookie{
		Name:     middleware.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Now().Add(-24 * time.Hour),
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
	})

	// 6. Broadcast perubahan suara secara asinkron ke live stream SSE
	if h.liveCountService != nil {
		h.liveCountService.BroadcastVote(electionID, validCandID)
	}

	return c.JSON(models.CastVoteResponse{
		Success: true,
		VoteID:  voteID,
		VotedAt: now,
	})
}
