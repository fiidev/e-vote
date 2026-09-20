package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port               string
	DatabaseURL        string
	JWTSecret          string
	CorsOrigin         string
	RateLimitTokenMax  int
	RateLimitGlobalMax int
	RateLimitWindow    time.Duration
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}

	jwtSecret := os.Getenv("BETTER_AUTH_SECRET")
	if jwtSecret == "" {
		jwtSecret = os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "super-secret-production-voting-key-change-me"
		}
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}

	tokenMax, _ := strconv.Atoi(os.Getenv("RATE_LIMIT_TOKEN_MAX"))
	if tokenMax <= 0 {
		tokenMax = 5
	}

	globalMax, _ := strconv.Atoi(os.Getenv("RATE_LIMIT_GLOBAL_MAX"))
	if globalMax <= 0 {
		globalMax = 2000
	}

	return &Config{
		Port:               port,
		DatabaseURL:        dbURL,
		JWTSecret:          jwtSecret,
		CorsOrigin:         corsOrigin,
		RateLimitTokenMax:  tokenMax,
		RateLimitGlobalMax: globalMax,
		RateLimitWindow:    1 * time.Minute,
	}
}
