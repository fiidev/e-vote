package middleware

import (
	"errors"
	"strings"
	"time"

	"github.com/fiidev/e-vote-api/internal/config"
	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

const SessionCookieName = "vote_session"

func GenerateSessionToken(tokenID, voterID, electionID, role string, secret string) (string, error) {
	claims := models.VoteClaims{
		TokenID:    tokenID,
		VoterID:    voterID,
		ElectionID: electionID,
		Role:       role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   voterID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateSession(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		rawToken := c.Cookies(SessionCookieName)

		// Jika tidak ada di cookie, cek Authorization header
		if rawToken == "" {
			authHeader := c.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				rawToken = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if rawToken == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
				Error:   "NO_VOTE_SESSION",
				Message: "Sesi voting tidak ditemukan. Silakan masukkan token kembali.",
			})
		}

		token, err := jwt.ParseWithClaims(rawToken, &models.VoteClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("metode signing token tidak valid")
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
				Error:   "INVALID_SESSION",
				Message: "Sesi voting kedaluwarsa atau tidak valid.",
			})
		}

		claims, ok := token.Claims.(*models.VoteClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
				Error:   "INVALID_SESSION_CLAIMS",
				Message: "Klaim sesi voting tidak valid.",
			})
		}

		c.Locals("claims", claims)
		return c.Next()
	}
}
