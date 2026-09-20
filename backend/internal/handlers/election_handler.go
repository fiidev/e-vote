package handlers

import (
	"context"
	"errors"
	"time"

	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/fiidev/e-vote-api/internal/services"
	"github.com/gofiber/fiber/v2"
)

type ElectionHandler struct {
	cacheService *services.ElectionCacheService
}

func NewElectionHandler(cacheService *services.ElectionCacheService) *ElectionHandler {
	return &ElectionHandler{
		cacheService: cacheService,
	}
}

func (h *ElectionHandler) GetActiveElection(c *fiber.Ctx) error {
	token := c.Query("token")

	ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
	defer cancel()

	election, err := h.cacheService.GetActiveElection(ctx, token)
	if err != nil {
		if errors.Is(err, services.ErrElectionNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
				Error:   "ELECTION_NOT_FOUND",
				Message: "Pemilihan tidak ditemukan atau tidak aktif.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal mengambil data pemilihan.",
		})
	}

	return c.JSON(election)
}

func (h *ElectionHandler) InvalidateCache(c *fiber.Ctx) error {
	h.cacheService.Invalidate()
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Cache pemilihan berhasil di-reset.",
	})
}
