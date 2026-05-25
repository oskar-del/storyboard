package export

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/db"
)

// Full handles GET /api/v1/export — returns full workspace JSON backup.
func Full(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		now := time.Now()
		dateStr := now.Format("2006-01-02")

		// Blocks
		blockRows, err := database.Pool.Query(c.Request.Context(), `
			SELECT id, project_name, type, status, title, summary, decisions, ideas, chips,
			       ts, date_label, author_key, captured_at
			FROM public.blocks
			WHERE user_id = $1 AND is_candidate = false
			ORDER BY captured_at DESC`,
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer blockRows.Close()

		type exportBlock struct {
			ID          string     `json:"id"`
			ProjectName string     `json:"project"`
			Type        string     `json:"type"`
			Status      string     `json:"status"`
			Title       string     `json:"title"`
			Summary     *string    `json:"summary,omitempty"`
			Decisions   []string   `json:"decisions,omitempty"`
			Ideas       []string   `json:"ideas,omitempty"`
			Chips       []string   `json:"chips,omitempty"`
			TS          *int       `json:"ts,omitempty"`
			DateLabel   *string    `json:"date,omitempty"`
			AuthorKey   *string    `json:"_author,omitempty"`
			CapturedAt  time.Time  `json:"_captured"`
		}

		var blocks []exportBlock
		projectSummary := map[string]map[string]int{}
		allDecisions := []map[string]string{}
		allRejections := []map[string]string{}
		allIntents := []map[string]string{}

		for blockRows.Next() {
			var b exportBlock
			blockRows.Scan(&b.ID, &b.ProjectName, &b.Type, &b.Status, &b.Title,
				&b.Summary, &b.Decisions, &b.Ideas, &b.Chips, &b.TS, &b.DateLabel, &b.AuthorKey, &b.CapturedAt)
			blocks = append(blocks, b)

			// Build project summary
			if _, ok := projectSummary[b.ProjectName]; !ok {
				projectSummary[b.ProjectName] = map[string]int{"total": 0}
			}
			projectSummary[b.ProjectName]["total"]++
			projectSummary[b.ProjectName][b.Type]++

			// Flat decision/rejection/intent lists
			for _, d := range b.Decisions {
				date := ""
				if b.DateLabel != nil {
					date = *b.DateLabel
				}
				allDecisions = append(allDecisions, map[string]string{"text": d, "project": b.ProjectName, "date": date})
			}
			if b.Type == "rejection" {
				allRejections = append(allRejections, map[string]string{"title": b.Title, "project": b.ProjectName})
			}
			if b.Type == "intent" {
				allIntents = append(allIntents, map[string]string{"title": b.Title, "project": b.ProjectName})
			}
		}

		// Raw captures
		rawRows, _ := database.Pool.Query(c.Request.Context(), `
			SELECT id, title, source, turn_count, processed, captured_at
			FROM public.raw_captures WHERE user_id = $1 ORDER BY captured_at DESC`,
			userID,
		)
		type rawCapture struct {
			ID         string    `json:"id"`
			Title      string    `json:"title"`
			Source     string    `json:"source"`
			TurnCount  int       `json:"turnCount"`
			Processed  bool      `json:"processed"`
			CapturedAt time.Time `json:"captured_at"`
		}
		var rawCaptures []rawCapture
		if rawRows != nil {
			defer rawRows.Close()
			for rawRows.Next() {
				var r rawCapture
				rawRows.Scan(&r.ID, &r.Title, &r.Source, &r.TurnCount, &r.Processed, &r.CapturedAt)
				rawCaptures = append(rawCaptures, r)
			}
		}

		if blocks == nil {
			blocks = []exportBlock{}
		}
		if rawCaptures == nil {
			rawCaptures = []rawCapture{}
		}

		payload := gin.H{
			"_meta": gin.H{
				"exportedAt":       now.Format(time.RFC3339),
				"exportDate":       dateStr,
				"version":          "2.0",
				"description":      "Storyboard full workspace backup",
				"blockCount":       len(blocks),
				"rawCaptureCount":  len(rawCaptures),
			},
			"projectSummary": projectSummary,
			"intents":        allIntents,
			"decisions":      allDecisions,
			"rejections":     allRejections,
			"blocks":         blocks,
			"rawCaptures":    rawCaptures,
		}

		filename := "storyboard-backup-" + dateStr + ".json"
		c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
		c.JSON(http.StatusOK, payload)
	}
}
