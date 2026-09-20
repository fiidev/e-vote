package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VoteEvent struct {
	ElectionID  string `json:"election_id"`
	CandidateID string `json:"candidate_id"`
}

type LiveCountService struct {
	pool      *pgxpool.Pool
	mu        sync.RWMutex
	listeners map[string]map[chan []byte]struct{}
}

func NewLiveCountService(pool *pgxpool.Pool) *LiveCountService {
	return &LiveCountService{
		pool:      pool,
		listeners: make(map[string]map[chan []byte]struct{}),
	}
}

func (s *LiveCountService) Subscribe(electionID string) chan []byte {
	s.mu.Lock()
	defer s.mu.Unlock()

	ch := make(chan []byte, 16)
	if _, ok := s.listeners[electionID]; !ok {
		s.listeners[electionID] = make(map[chan []byte]struct{})
	}
	s.listeners[electionID][ch] = struct{}{}
	return ch
}

func (s *LiveCountService) Unsubscribe(electionID string, ch chan []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if m, ok := s.listeners[electionID]; ok {
		delete(m, ch)
		close(ch)
		if len(m) == 0 {
			delete(s.listeners, electionID)
		}
	}
}

func (s *LiveCountService) BroadcastVote(electionID string, candidateID string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		countData, err := s.GetLiveCount(ctx, electionID)
		if err != nil {
			return
		}

		payload, err := json.Marshal(countData)
		if err != nil {
			return
		}

		s.mu.RLock()
		defer s.mu.RUnlock()

		if m, ok := s.listeners[electionID]; ok {
			for ch := range m {
				select {
				case ch <- payload:
				default:
					// Jangan block jika listener buffer penuh
				}
			}
		}
	}()
}

func (s *LiveCountService) GetLiveCount(ctx context.Context, electionID string) (*models.LiveCountResponse, error) {
	query := `
		SELECT 
			c.candidate_id,
			c.candidate_number,
			c.name,
			c.photo_url,
			COUNT(v.vote_id) AS vote_count
		FROM candidates c
		LEFT JOIN votes v ON c.candidate_id = v.candidate_id AND v.election_id = c.election_id
		WHERE c.election_id = $1
		GROUP BY c.candidate_id, c.candidate_number, c.name, c.photo_url
		ORDER BY c.candidate_number ASC
	`

	rows, err := s.pool.Query(ctx, query, electionID)
	if err != nil {
		return nil, fmt.Errorf("gagal query live count: %w", err)
	}
	defer rows.Close()

	candidates := make([]models.LiveCountCandidate, 0)
	var totalVotes int64 = 0

	for rows.Next() {
		var cand models.LiveCountCandidate
		if err := rows.Scan(
			&cand.CandidateID,
			&cand.CandidateNumber,
			&cand.Name,
			&cand.PhotoURL,
			&cand.VoteCount,
		); err != nil {
			return nil, fmt.Errorf("gagal scan candidate vote count: %w", err)
		}
		totalVotes += cand.VoteCount
		candidates = append(candidates, cand)
	}

	// Hitung persentase
	for i := range candidates {
		if totalVotes > 0 {
			candidates[i].Percentage = float64(candidates[i].VoteCount) / float64(totalVotes) * 100
		} else {
			candidates[i].Percentage = 0.0
		}
	}

	return &models.LiveCountResponse{
		ElectionID: electionID,
		TotalVotes: totalVotes,
		Candidates: candidates,
		UpdatedAt:  time.Now(),
	}, nil
}
