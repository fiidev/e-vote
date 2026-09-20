package services

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/fiidev/e-vote-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrElectionNotFound = errors.New("ELECTION_NOT_FOUND")
)

type ElectionCacheService struct {
	pool           *pgxpool.Pool
	mu             sync.RWMutex
	cachedElection *models.ElectionWithCandidates
	cachedAt       time.Time
	ttl            time.Duration
}

func NewElectionCacheService(pool *pgxpool.Pool, ttl time.Duration) *ElectionCacheService {
	if ttl <= 0 {
		ttl = 60 * time.Second
	}
	return &ElectionCacheService{
		pool: pool,
		ttl:  ttl,
	}
}

func (s *ElectionCacheService) Invalidate() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cachedElection = nil
}

func (s *ElectionCacheService) GetActiveElection(ctx context.Context, tokenCode string) (*models.ElectionWithCandidates, error) {
	s.mu.RLock()
	if tokenCode == "" && s.cachedElection != nil && time.Since(s.cachedAt) < s.ttl {
		cached := s.cachedElection
		s.mu.RUnlock()
		return cached, nil
	}
	s.mu.RUnlock()

	now := time.Now()
	var election models.ElectionWithCandidates

	if tokenCode != "" {
		query := `
			SELECT 
				e.election_id, e.title, e.description, e.start_time, e.end_time, e.is_active,
				o.id, o.name, o.code, o.slug, o."logoUrl"
			FROM vote_tokens vt
			JOIN elections e ON vt.election_id = e.election_id
			JOIN organizations o ON e."organizationId" = o.id
			WHERE vt.token_code = $1
			LIMIT 1
		`
		err := s.pool.QueryRow(ctx, query, tokenCode).Scan(
			&election.ElectionID,
			&election.Title,
			&election.Description,
			&election.StartTime,
			&election.EndTime,
			&election.IsActive,
			&election.Organization.ID,
			&election.Organization.Name,
			&election.Organization.Code,
			&election.Organization.Slug,
			&election.Organization.LogoURL,
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrElectionNotFound
			}
			return nil, fmt.Errorf("gagal query election via token: %w", err)
		}
	} else {
		query := `
			SELECT 
				e.election_id, e.title, e.description, e.start_time, e.end_time, e.is_active,
				o.id, o.name, o.code, o.slug, o."logoUrl"
			FROM elections e
			JOIN organizations o ON e."organizationId" = o.id
			WHERE e.is_active = true AND e.start_time <= $1 AND e.end_time >= $1
			ORDER BY e.created_at DESC
			LIMIT 1
		`
		err := s.pool.QueryRow(ctx, query, now).Scan(
			&election.ElectionID,
			&election.Title,
			&election.Description,
			&election.StartTime,
			&election.EndTime,
			&election.IsActive,
			&election.Organization.ID,
			&election.Organization.Name,
			&election.Organization.Code,
			&election.Organization.Slug,
			&election.Organization.LogoURL,
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrElectionNotFound
			}
			return nil, fmt.Errorf("gagal query active election: %w", err)
		}
	}

	// Fetch Candidates
	candQuery := `
		SELECT 
			candidate_id, election_id, candidate_number, name, class_name, photo_url, vision, mission
		FROM candidates
		WHERE election_id = $1
		ORDER BY candidate_number ASC
	`
	rows, err := s.pool.Query(ctx, candQuery, election.ElectionID)
	if err != nil {
		return nil, fmt.Errorf("gagal query candidates: %w", err)
	}
	defer rows.Close()

	candidates := make([]models.Candidate, 0)
	for rows.Next() {
		var c models.Candidate
		if err := rows.Scan(
			&c.CandidateID,
			&c.ElectionID,
			&c.CandidateNumber,
			&c.Name,
			&c.ClassName,
			&c.PhotoURL,
			&c.Vision,
			&c.Mission,
		); err != nil {
			return nil, fmt.Errorf("gagal scan candidate: %w", err)
		}
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterasi candidates: %w", err)
	}

	election.Candidates = candidates

	s.mu.Lock()
	s.cachedElection = &election
	s.cachedAt = time.Now()
	s.mu.Unlock()

	return &election, nil
}
