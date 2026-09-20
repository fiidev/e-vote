package middleware

import (
	"sync"
	"time"

	"github.com/fiidev/e-vote-api/internal/config"
	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/gofiber/fiber/v2"
)

type RateLimiter struct {
	mu                         sync.RWMutex
	tokenAttempts              map[string]int
	globalFailures             int
	globalWindowStart          time.Time
	maxAttemptsPerToken        int
	maxGlobalFailuresPerWindow int
	windowDuration             time.Duration
}

func NewRateLimiter(cfg *config.Config) *RateLimiter {
	return &RateLimiter{
		tokenAttempts:              make(map[string]int),
		globalWindowStart:          time.Now(),
		maxAttemptsPerToken:        cfg.RateLimitTokenMax,
		maxGlobalFailuresPerWindow: cfg.RateLimitGlobalMax,
		windowDuration:             cfg.RateLimitWindow,
	}
}

func (rl *RateLimiter) checkRollWindow(now time.Time) {
	if now.Sub(rl.globalWindowStart) >= rl.windowDuration {
		rl.globalFailures = 0
		rl.globalWindowStart = now
	}
}

func (rl *RateLimiter) IsTokenLocked(token string) bool {
	rl.mu.RLock()
	defer rl.mu.RUnlock()
	return rl.tokenAttempts[token] >= rl.maxAttemptsPerToken
}

func (rl *RateLimiter) IsGloballyThrottled() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.checkRollWindow(time.Now())
	return rl.globalFailures >= rl.maxGlobalFailuresPerWindow
}

func (rl *RateLimiter) RecordFailure(token string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	rl.checkRollWindow(now)
	rl.tokenAttempts[token]++
	rl.globalFailures++
}

func (rl *RateLimiter) ResetToken(token string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.tokenAttempts, token)
}

func (rl *RateLimiter) GlobalThrottleMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if rl.IsGloballyThrottled() {
			return c.Status(fiber.StatusTooManyRequests).JSON(models.ErrorResponse{
				Error:   "RATE_LIMITED",
				Message: "Terlalu banyak percobaan gagal pada sistem. Silakan tunggu sebentar.",
			})
		}
		return c.Next()
	}
}
