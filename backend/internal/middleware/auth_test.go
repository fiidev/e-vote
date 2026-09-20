package middleware_test

import (
	"testing"

	"github.com/fiidev/e-vote-api/internal/middleware"
	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

func TestAuth_GenerateAndVerifySession(t *testing.T) {
	secret := "test-jwt-secret-key-123456789"
	tokenID := "tok-123"
	voterID := "vot-456"
	electionID := "elec-789"
	role := "SISWA"

	tokenStr, err := middleware.GenerateSessionToken(tokenID, voterID, electionID, role, secret)
	if err != nil {
		t.Fatalf("unexpected error generating token: %v", err)
	}

	if tokenStr == "" {
		t.Fatalf("expected non-empty token string")
	}

	// Parse & verify
	token, err := jwt.ParseWithClaims(tokenStr, &models.VoteClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		t.Fatalf("expected valid token, got error: %v", err)
	}

	claims, ok := token.Claims.(*models.VoteClaims)
	if !ok {
		t.Fatalf("failed to cast claims")
	}

	if claims.TokenID != tokenID {
		t.Errorf("expected TokenID %s, got %s", tokenID, claims.TokenID)
	}
	if claims.VoterID != voterID {
		t.Errorf("expected VoterID %s, got %s", voterID, claims.VoterID)
	}
	if claims.ElectionID != electionID {
		t.Errorf("expected ElectionID %s, got %s", electionID, claims.ElectionID)
	}
	if claims.Role != role {
		t.Errorf("expected Role %s, got %s", role, claims.Role)
	}
}

func TestAuth_InvalidSignature(t *testing.T) {
	secret := "correct-secret"
	wrongSecret := "wrong-secret"

	tokenStr, _ := middleware.GenerateSessionToken("t", "v", "e", "SISWA", secret)

	_, err := jwt.ParseWithClaims(tokenStr, &models.VoteClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(wrongSecret), nil
	})

	if err == nil {
		t.Fatalf("expected signature validation failure with wrong secret")
	}
}
