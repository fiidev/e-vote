package middleware_test

import (
	"testing"
	"time"

	"github.com/fiidev/e-vote-api/internal/config"
	"github.com/fiidev/e-vote-api/internal/middleware"
)

func TestRateLimiter_TokenLockout(t *testing.T) {
	cfg := &config.Config{
		RateLimitTokenMax:  3,
		RateLimitGlobalMax: 100,
		RateLimitWindow:    1 * time.Minute,
	}

	rl := middleware.NewRateLimiter(cfg)
	testToken := "TEST-TOKEN-1234"

	if rl.IsTokenLocked(testToken) {
		t.Fatalf("expected token not to be locked initially")
	}

	// 1st failure
	rl.RecordFailure(testToken)
	if rl.IsTokenLocked(testToken) {
		t.Fatalf("expected token not to be locked after 1 failure")
	}

	// 2nd failure
	rl.RecordFailure(testToken)
	if rl.IsTokenLocked(testToken) {
		t.Fatalf("expected token not to be locked after 2 failures")
	}

	// 3rd failure (hits max)
	rl.RecordFailure(testToken)
	if !rl.IsTokenLocked(testToken) {
		t.Fatalf("expected token to be locked after 3 failures")
	}

	// Reset token
	rl.ResetToken(testToken)
	if rl.IsTokenLocked(testToken) {
		t.Fatalf("expected token to be unlocked after ResetToken")
	}
}

func TestRateLimiter_GlobalThrottle(t *testing.T) {
	cfg := &config.Config{
		RateLimitTokenMax:  5,
		RateLimitGlobalMax: 3,
		RateLimitWindow:    100 * time.Millisecond,
	}

	rl := middleware.NewRateLimiter(cfg)

	rl.RecordFailure("token-1")
	rl.RecordFailure("token-2")
	if rl.IsGloballyThrottled() {
		t.Fatalf("expected global limiter not throttled yet")
	}

	rl.RecordFailure("token-3")
	if !rl.IsGloballyThrottled() {
		t.Fatalf("expected global limiter to be throttled after 3 failures")
	}

	// Wait for window to roll over
	time.Sleep(120 * time.Millisecond)
	if rl.IsGloballyThrottled() {
		t.Fatalf("expected global limiter to reset after window expires")
	}
}
