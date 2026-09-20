package models

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type VerifyTokenRequest struct {
	Token string `json:"token"`
}

type VerifyTokenResponse struct {
	Success    bool   `json:"success"`
	ElectionID string `json:"electionId"`
	VoterID    string `json:"voterId"`
	Session    string `json:"session,omitempty"`
	Message    string `json:"message,omitempty"`
}

type OrganizationInfo struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Code    string  `json:"code"`
	Slug    string  `json:"slug"`
	LogoURL *string `json:"logoUrl"`
}

type Candidate struct {
	CandidateID     string `json:"candidate_id"`
	ElectionID      string `json:"election_id"`
	CandidateNumber int    `json:"candidate_number"`
	Name            string `json:"name"`
	ClassName       string `json:"class_name"`
	PhotoURL        string `json:"photo_url"`
	Vision          string `json:"vision"`
	Mission         string `json:"mission"`
}

type ElectionWithCandidates struct {
	ElectionID   string           `json:"election_id"`
	Title        string           `json:"title"`
	Description  *string          `json:"description"`
	StartTime    time.Time        `json:"start_time"`
	EndTime      time.Time        `json:"end_time"`
	IsActive     bool             `json:"is_active"`
	Organization OrganizationInfo `json:"organization"`
	Candidates   []Candidate      `json:"candidates"`
}

type CastVoteRequest struct {
	CandidateID string `json:"candidateId"`
}

type CastVoteResponse struct {
	Success bool      `json:"success"`
	VoteID  string    `json:"voteId"`
	VotedAt time.Time `json:"votedAt"`
}

type LiveCountCandidate struct {
	CandidateID     string  `json:"candidate_id"`
	CandidateNumber int     `json:"candidate_number"`
	Name            string  `json:"name"`
	PhotoURL        string  `json:"photo_url"`
	VoteCount       int64   `json:"vote_count"`
	Percentage      float64 `json:"percentage"`
}

type LiveCountResponse struct {
	ElectionID string               `json:"election_id"`
	TotalVotes int64                `json:"total_votes"`
	Candidates []LiveCountCandidate `json:"candidates"`
	UpdatedAt  time.Time            `json:"updated_at"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type VoteClaims struct {
	TokenID    string `json:"tokenId"`
	VoterID    string `json:"voterId"`
	ElectionID string `json:"electionId"`
	Role       string `json:"role"`
	jwt.RegisteredClaims
}
