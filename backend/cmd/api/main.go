package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fiidev/e-vote-api/internal/config"
	"github.com/fiidev/e-vote-api/internal/database"
	"github.com/fiidev/e-vote-api/internal/handlers"
	"github.com/fiidev/e-vote-api/internal/middleware"
	"github.com/fiidev/e-vote-api/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	cfg := config.LoadConfig()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 1. Inisialisasi Database Pool (pgxpool)
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Fatal: Gagal menginisialisasi database pool: %v", err)
	}
	defer pool.Close()

	// 2. Inisialisasi Services & Middleware
	electionCache := services.NewElectionCacheService(pool, 60*time.Second)
	liveCountService := services.NewLiveCountService(pool)
	rateLimiter := middleware.NewRateLimiter(cfg)

	// 3. Inisialisasi Handlers
	authHandler := handlers.NewAuthHandler(pool, cfg, rateLimiter)
	electionHandler := handlers.NewElectionHandler(electionCache)
	voteHandler := handlers.NewVoteHandler(pool, cfg, rateLimiter, liveCountService)
	liveCountHandler := handlers.NewLiveCountHandler(liveCountService)

	// 4. Inisialisasi Fiber App
	app := fiber.New(fiber.Config{
		AppName:      "E-Vote Go High-Performance API v1.0",
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	})

	// Global Middleware
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsOrigin,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Vote-Token",
		AllowMethods:     "GET, POST, OPTIONS",
		AllowCredentials: true,
	}))

	// Health check endpoint
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"uptime": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// API v1 Routes
	v1 := app.Group("/api/v1")
	v1.Use(rateLimiter.GlobalThrottleMiddleware())

	// Public / Kiosk Routes
	v1.Post("/auth/verify", authHandler.VerifyToken)
	v1.Get("/elections/active", electionHandler.GetActiveElection)
	v1.Post("/votes", voteHandler.CastVote)

	// Live Count Snapshot & Real-time SSE
	v1.Get("/live-count", liveCountHandler.GetLiveCountSnapshot)
	v1.Get("/live-stream", liveCountHandler.StreamLiveCount)

	// Cache Management
	v1.Post("/admin/elections/invalidate-cache", electionHandler.InvalidateCache)

	// 5. Jalankan server di goroutine
	serverAddr := ":" + cfg.Port
	go func() {
		log.Printf("Server E-Vote Go API berjalan pada port %s", cfg.Port)
		if err := app.Listen(serverAddr); err != nil {
			log.Printf("Server stop: %v", err)
		}
	}()

	// 6. Graceful Shutdown
	<-ctx.Done()
	log.Println("Menerima sinyal terminasi, mematikan server secara graceful...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Printf("Error saat shutdown server: %v", err)
	}

	log.Println("Server Go API berhasil dimatikan.")
}
