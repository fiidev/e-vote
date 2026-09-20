package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/fiidev/e-vote-api/internal/services"
	"github.com/gofiber/fiber/v2"
)

type LiveCountHandler struct {
	liveCountService *services.LiveCountService
}

func NewLiveCountHandler(liveCount *services.LiveCountService) *LiveCountHandler {
	return &LiveCountHandler{
		liveCountService: liveCount,
	}
}

func (h *LiveCountHandler) GetLiveCountSnapshot(c *fiber.Ctx) error {
	electionID := c.Query("election_id")
	if electionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "INVALID_INPUT",
			Message: "Parameter election_id diperlukan.",
		})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
	defer cancel()

	data, err := h.liveCountService.GetLiveCount(ctx, electionID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Message: "Gagal mengambil data perolehan suara.",
		})
	}

	return c.JSON(data)
}

func (h *LiveCountHandler) StreamLiveCount(c *fiber.Ctx) error {
	electionID := c.Query("election_id")
	if electionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "INVALID_INPUT",
			Message: "Parameter election_id diperlukan.",
		})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")
	c.Set("X-Accel-Buffering", "no")

	subCh := h.liveCountService.Subscribe(electionID)

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer h.liveCountService.Unsubscribe(electionID, subCh)

		// 1. Kirim data awal (snapshot)
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		initialData, err := h.liveCountService.GetLiveCount(ctx, electionID)
		cancel()

		if err == nil {
			if payload, err := json.Marshal(initialData); err == nil {
				fmt.Fprintf(w, "event: message\ndata: %s\n\n", payload)
				_ = w.Flush()
			}
		}

		// 2. Loop streaming event & ping keep-alive
		pingTicker := time.NewTicker(15 * time.Second)
		defer pingTicker.Stop()

		for {
			select {
			case payload, ok := <-subCh:
				if !ok {
					return
				}
				fmt.Fprintf(w, "event: message\ndata: %s\n\n", payload)
				if err := w.Flush(); err != nil {
					return
				}
			case <-pingTicker.C:
				fmt.Fprintf(w, ": ping\n\n")
				if err := w.Flush(); err != nil {
					return
				}
			}
		}
	})

	return nil
}
