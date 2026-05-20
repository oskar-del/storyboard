package blocks

import "time"

// Block mirrors the public.blocks table row.
type Block struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	ProjectID   *string   `json:"project_id,omitempty" db:"project_id"`
	ProjectName string    `json:"project" db:"project_name"`
	Type        string    `json:"type" db:"type"`
	Status      string    `json:"status" db:"status"`
	Title       string    `json:"title" db:"title"`
	Summary     *string   `json:"summary,omitempty" db:"summary"`
	Seed        *string   `json:"seed,omitempty" db:"seed"`
	Task        *string   `json:"task,omitempty" db:"task"`
	Chips       []string  `json:"chips,omitempty" db:"chips"`
	Decisions   []string  `json:"decisions,omitempty" db:"decisions"`
	Ideas       []string  `json:"ideas,omitempty" db:"ideas"`
	Tags        []string  `json:"tags,omitempty" db:"tags"`
	Heat        *string   `json:"heat,omitempty" db:"heat"`
	ReplacedBy  *string   `json:"replacedBy,omitempty" db:"replaced_by"`
	IsLive      bool      `json:"_live,omitempty" db:"is_live"`
	IsCandidate bool      `json:"_candidate,omitempty" db:"is_candidate"`
	Source      *string   `json:"_source,omitempty" db:"source"`
	SourceURL   *string   `json:"_url,omitempty" db:"source_url"`
	TurnCount   *int      `json:"turnCount,omitempty" db:"turn_count"`
	TS          *int      `json:"ts,omitempty" db:"ts"`
	DateLabel   *string   `json:"date,omitempty" db:"date_label"`
	AuthorKey   *string   `json:"_author,omitempty" db:"author_key"`
	CapturedAt  time.Time `json:"_captured" db:"captured_at"`
	UpdatedAt   time.Time `json:"_updated,omitempty" db:"updated_at"`
}

// CreateRequest is the request body for POST /api/v1/blocks.
type CreateRequest struct {
	ID          string   `json:"id"`
	ProjectName string   `json:"project" binding:"required"`
	Type        string   `json:"type" binding:"required"`
	Status      string   `json:"status"`
	Title       string   `json:"title" binding:"required"`
	Summary     string   `json:"summary"`
	Seed        string   `json:"seed"`
	Task        string   `json:"task"`
	Chips       []string `json:"chips"`
	Decisions   []string `json:"decisions"`
	Ideas       []string `json:"ideas"`
	Tags        []string `json:"tags"`
	Heat        string   `json:"heat"`
	ReplacedBy  string   `json:"replacedBy"`
	IsLive      bool     `json:"_live"`
	Source      string   `json:"_source"`
	SourceURL   string   `json:"_url"`
	TurnCount   int      `json:"turnCount"`
	TS          int      `json:"ts"`
	DateLabel   string   `json:"date"`
}

// UpdateRequest is the request body for PATCH /api/v1/blocks/:id.
type UpdateRequest struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

// ListFilter holds query parameters for GET /api/v1/blocks.
type ListFilter struct {
	Project string
	Type    string
	Status  string
	Since   int    // YYYYMMDD
	Limit   int
	Query   string // full-text search
}
