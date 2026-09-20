package handlers

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/fiidev/e-vote-api/internal/config"
	"github.com/fiidev/e-vote-api/internal/middleware"
	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthHandler struct {
	pool        *pgxpool.Pool
	cfg         *config.Config
	rateLimiter *middleware.RateLimiter
}

func NewAuthHandler(pool *pgxpool.Pool, cfg *config.Config, rl *middleware.RateLimiter) *AuthHandler {
	return &AuthHandler{
		pool:        pool,
		cfg:         cfg,
		rateLimiter: rl,
	}
}

func (h *AuthHandler) VerifyToken(c *fiber.Ctx) error {
	var req models.VerifyTokenRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Token) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "INVALID_INPUT",
			Message: "Data yang dimasukkan tidak valid.",
		})
	}

	token := strings.TrimSpace(req.Token)

	// 1. Rate limiter check
	if h.rateLimiter.IsTokenLocked(token) {
		return c.Status(fiber.StatusTooManyRequests).JSON(models.ErrorResponse{
			Error:   "TOKEN_LOCKED",
			Message: "Terlalu banyak percobaan gagal. Silakan coba lagi nanti.",
		})
	}
	if h.rateLimiter.IsGloballyThrottled() {
		return c.Status(fiber.StatusTooManyRequests).JSON(models.ErrorResponse{
			Error:   "RATE_LIMITED",
			Message: "Terlalu banyak permintaan. Mohon tunggu beberapa saat.",
		})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
	defer cancel()

	query := `
		SELECT 
			vt.token_id, vt.voter_id, vt.election_id, vt.is_used,
			e.start_time, e.end_time, e.is_active, e.eligible_roles,
			v.role
		FROM vote_tokens vt
		JOIN elections e ON vt.election_id = e.election_id
		JOIN voters v ON vt.voter_id = v.voter_id
		WHERE vt.token_code = $1
		LIMIT 1
	`

	var (
		tokenID       string
		voterID       string
		electionID    string
		isUsed        bool
		startTime     time.Time
		endTime       time.Time
		isActive      bool
		eligibleRoles []string
		voterRole     string
	)

	err := h.pool.QueryRow(ctx, query, token).Scan(
		&tokenID,
		&voterID,
		&electionID,
		&isUsed,
		&startTime,
		&endTime,
		&isActive,
		&eligibleRoles,
		&voterRole,
	)

	if err != nil {
		h.rateLimiter.RecordFailure(token)
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
				Error:   "TOKEN_INVALID",
				Message: "Token tidak valid. Periksa kembali token Anda.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Terjadi kesalahan server saat memvalidasi token.",
		})
	}

	if isUsed {
		h.rateLimiter.RecordFailure(token)
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "TOKEN_ALREADY_USED",
			Message: "Token ini sudah digunakan untuk memilih.",
		})
	}

	if !isActive {
		h.rateLimiter.RecordFailure(token)
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "ELECTION_NOT_FOUND",
			Message: "Pemilihan tidak ditemukan atau tidak aktif.",
		})
	}

	now := time.Now()
	if now.Before(startTime) {
		h.rateLimiter.RecordFailure(token)
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "ELECTION_NOT_STARTED",
			Message: "Pemilihan belum dimulai.",
		})
	}

	if now.After(endTime) {
		h.rateLimiter.RecordFailure(token)
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "ELECTION_ENDED",
			Message: "Pemilihan sudah berakhir.",
		})
	}

	roleEligible := false
	for _, r := range eligibleRoles {
		if r == voterRole {
			roleEligible = true
			break
		}
	}
	if !roleEligible {
		h.rateLimiter.RecordFailure(token)
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "VOTER_NOT_ELIGIBLE",
			Message: "Anda tidak berhak memilih dalam pemilihan ini.",
		})
	}

	// Reset attempts on successful verification
	h.rateLimiter.ResetToken(token)

	// Issue JWT session token
	sessionJWT, err := middleware.GenerateSessionToken(tokenID, voterID, electionID, voterRole, h.cfg.JWTSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal membuat sesi voting.",
		})
	}

	isSecure := c.Protocol() == "https" || c.Get("X-Forwarded-Proto") == "https"
	c.Cookie(&fiber.Cookie{
		Name:     middleware.SessionCookieName,
		Value:    sessionJWT,
		Path:     "/",
		MaxAge:   3600, // 1 hour
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
	})

	return c.JSON(models.VerifyTokenResponse{
		Success:    true,
		ElectionID: electionID,
		VoterID:    voterID,
		Session:    sessionJWT,
	})
}
