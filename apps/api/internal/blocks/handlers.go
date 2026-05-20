package blocks

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/db"
)

func List(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		f := ListFilter{
			Project: c.Query("project"),
			Type:    c.Query("type"),
			Status:  c.Query("status"),
			Query:   c.Query("q"),
			Limit:   100,
		}
		if s := c.Query("since"); s != "" {
			f.Since, _ = strconv.Atoi(s)
		}
		if l := c.Query("limit"); l != "" {
			f.Limit, _ = strconv.Atoi(l)
			if f.Limit > 500 {
				f.Limit = 500
			}
		}

		rows, err := listBlocks(c.Request.Context(), database, userID, f) //nolint:contextcheck
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, rows)
	}
}

func Get(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		id := c.Param("id")
		block, err := getBlock(c.Request.Context(), database, userID, id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "block not found"})
			return
		}
		c.JSON(http.StatusOK, block)
	}
}

func Create(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		authorKey := c.GetHeader("X-Storyboard-Author")

		var req CreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		block, err := createBlock(c.Request.Context(), database, userID, authorKey, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, block)
	}
}

func Update(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		id := c.Param("id")

		var req UpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		block, err := updateBlock(c.Request.Context(), database, userID, id, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, block)
	}
}

// ── DB helpers ────────────────────────────────────────────────────────────────

func listBlocks(ctx context.Context, database *db.DB, userID string, f ListFilter) ([]Block, error) {
	query := `
		SELECT b.id, b.user_id, b.project_id, b.project_name, b.type, b.status,
		       b.title, b.summary, b.seed, b.task, b.chips, b.decisions, b.ideas, b.tags,
		       b.heat, b.replaced_by, b.is_live, b.is_candidate, b.source, b.source_url,
		       b.turn_count, b.ts, b.date_label, b.author_key, b.captured_at, b.updated_at
		FROM public.blocks b
		WHERE (b.user_id = $1
		   OR b.project_id IN (
		         SELECT project_id FROM public.project_members WHERE user_id = $1
		   ))
		   AND b.is_candidate = false`

	args := []any{userID}
	i := 2

	if f.Project != "" {
		query += fmt.Sprintf(" AND b.project_name = $%d", i)
		args = append(args, f.Project)
		i++
	}
	if f.Type != "" {
		query += fmt.Sprintf(" AND b.type = $%d", i)
		args = append(args, f.Type)
		i++
	}
	if f.Status != "" {
		query += fmt.Sprintf(" AND b.status = $%d", i)
		args = append(args, f.Status)
		i++
	}
	if f.Since > 0 {
		query += fmt.Sprintf(" AND b.ts >= $%d", i)
		args = append(args, f.Since)
		i++
	}
	if f.Query != "" {
		query += fmt.Sprintf(" AND to_tsvector('english', coalesce(b.title,'') || ' ' || coalesce(b.summary,'')) @@ plainto_tsquery('english', $%d)", i)
		args = append(args, f.Query)
		i++
	}

	query += fmt.Sprintf(" ORDER BY b.captured_at DESC LIMIT $%d", i)
	args = append(args, f.Limit)

	rows, err := database.Pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Block
	for rows.Next() {
		var b Block
		err := rows.Scan(
			&b.ID, &b.UserID, &b.ProjectID, &b.ProjectName, &b.Type, &b.Status,
			&b.Title, &b.Summary, &b.Seed, &b.Task, &b.Chips, &b.Decisions, &b.Ideas, &b.Tags,
			&b.Heat, &b.ReplacedBy, &b.IsLive, &b.IsCandidate, &b.Source, &b.SourceURL,
			&b.TurnCount, &b.TS, &b.DateLabel, &b.AuthorKey, &b.CapturedAt, &b.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func getBlock(ctx context.Context, database *db.DB, userID, id string) (*Block, error) {
	var b Block
	err := database.Pool.QueryRow(context.Background(), `
		SELECT b.id, b.user_id, b.project_id, b.project_name, b.type, b.status,
		       b.title, b.summary, b.seed, b.task, b.chips, b.decisions, b.ideas, b.tags,
		       b.heat, b.replaced_by, b.is_live, b.is_candidate, b.source, b.source_url,
		       b.turn_count, b.ts, b.date_label, b.author_key, b.captured_at, b.updated_at
		FROM public.blocks b
		WHERE b.id = $1
		  AND (b.user_id = $2
		       OR b.project_id IN (SELECT project_id FROM public.project_members WHERE user_id = $2))`,
		id, userID,
	).Scan(
		&b.ID, &b.UserID, &b.ProjectID, &b.ProjectName, &b.Type, &b.Status,
		&b.Title, &b.Summary, &b.Seed, &b.Task, &b.Chips, &b.Decisions, &b.Ideas, &b.Tags,
		&b.Heat, &b.ReplacedBy, &b.IsLive, &b.IsCandidate, &b.Source, &b.SourceURL,
		&b.TurnCount, &b.TS, &b.DateLabel, &b.AuthorKey, &b.CapturedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func createBlock(ctx context.Context, database *db.DB, userID, authorKey string, req CreateRequest) (*Block, error) {
	now := time.Now()
	ts := toTS(now)
	dateLabel := now.Format("2 Jan")

	// Generate ID if not provided
	id := req.ID
	if id == "" {
		id = fmt.Sprintf("%s-%s-%d", req.Type, strings.ToLower(strings.ReplaceAll(req.ProjectName, " ", "-")), now.UnixMilli())
	}
	if req.TS > 0 {
		ts = req.TS
	}
	if req.DateLabel != "" {
		dateLabel = req.DateLabel
	}

	status := req.Status
	if status == "" {
		status = "done"
	}

	// Resolve project_id from project name
	var projectID *string
	var pid string
	err := database.Pool.QueryRow(context.Background(),
		`SELECT id FROM public.projects WHERE owner_id = $1 AND name = $2
		 UNION
		 SELECT p.id FROM public.projects p
		   JOIN public.project_members pm ON pm.project_id = p.id
		   WHERE pm.user_id = $1 AND p.name = $2
		 LIMIT 1`,
		userID, req.ProjectName,
	).Scan(&pid)
	if err == nil {
		projectID = &pid
	}

	var b Block
	err = database.Pool.QueryRow(context.Background(), `
		INSERT INTO public.blocks
		  (id, user_id, project_id, project_name, type, status, title, summary, seed, task,
		   chips, decisions, ideas, tags, heat, replaced_by, is_live, source, source_url,
		   turn_count, ts, date_label, author_key, captured_at)
		VALUES
		  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
		   $11,$12,$13,$14,$15,$16,$17,$18,$19,
		   $20,$21,$22,$23,$24)
		ON CONFLICT (id) DO UPDATE SET
		  status = EXCLUDED.status,
		  summary = EXCLUDED.summary,
		  updated_at = now()
		RETURNING id, user_id, project_id, project_name, type, status, title, summary,
		          seed, task, chips, decisions, ideas, tags, heat, replaced_by,
		          is_live, is_candidate, source, source_url, turn_count, ts, date_label,
		          author_key, captured_at, updated_at`,
		id, userID, projectID, req.ProjectName, req.Type, status, req.Title,
		nilStr(req.Summary), nilStr(req.Seed), nilStr(req.Task),
		req.Chips, req.Decisions, req.Ideas, req.Tags,
		nilStr(req.Heat), nilStr(req.ReplacedBy),
		req.IsLive, nilStr(req.Source), nilStr(req.SourceURL),
		nilInt(req.TurnCount), ts, dateLabel, nilStr(authorKey), now,
	).Scan(
		&b.ID, &b.UserID, &b.ProjectID, &b.ProjectName, &b.Type, &b.Status,
		&b.Title, &b.Summary, &b.Seed, &b.Task, &b.Chips, &b.Decisions, &b.Ideas, &b.Tags,
		&b.Heat, &b.ReplacedBy, &b.IsLive, &b.IsCandidate, &b.Source, &b.SourceURL,
		&b.TurnCount, &b.TS, &b.DateLabel, &b.AuthorKey, &b.CapturedAt, &b.UpdatedAt,
	)
	return &b, err
}

func updateBlock(ctx context.Context, database *db.DB, userID, id string, req UpdateRequest) (*Block, error) {
	// Append note to summary if provided
	if req.Note != "" {
		_, err := database.Pool.Exec(context.Background(), `
			UPDATE public.blocks
			   SET summary = coalesce(summary,'') || E'\n\n[' || to_char(now(), 'DD Mon HH24:MI') || '] ' || $1,
			       updated_at = now()
			 WHERE id = $2 AND (user_id = $3 OR project_id IN (
			       SELECT project_id FROM public.project_members WHERE user_id = $3))`,
			req.Note, id, userID,
		)
		if err != nil {
			return nil, err
		}
	}
	if req.Status != "" {
		_, err := database.Pool.Exec(context.Background(), `
			UPDATE public.blocks SET status = $1, updated_at = now()
			 WHERE id = $2 AND (user_id = $3 OR project_id IN (
			       SELECT project_id FROM public.project_members WHERE user_id = $3))`,
			req.Status, id, userID,
		)
		if err != nil {
			return nil, err
		}
	}
	return getBlock(ctx, database, userID, id)
}

func toTS(t time.Time) int {
	return t.Year()*10000 + int(t.Month())*100 + t.Day()
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nilInt(n int) *int {
	if n == 0 {
		return nil
	}
	return &n
}
