package capture

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/db"
)

// Web handles POST /api/v1/capture/web — browser extension captures.
func Web(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		authorKey := c.GetHeader("X-Storyboard-Author")

		var payload map[string]any
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		title, _ := payload["title"].(string)
		blockType, _ := payload["type"].(string)
		if title == "" || blockType == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing title or type"})
			return
		}

		project, _ := payload["project"].(string)
		if project == "" {
			project = inferProject(c, database, userID)
		}

		now := time.Now()
		ts := now.Year()*10000 + int(now.Month())*100 + now.Day()
		id := fmt.Sprintf("web-%s-%d", blockType, now.UnixMilli())

		if len(title) > 120 {
			title = title[:120]
		}

		summary := buildSummary(payload)

		_, err := database.Pool.Exec(c.Request.Context(), `
			INSERT INTO public.blocks
			  (id, user_id, project_name, type, status, title, summary, source, source_url,
			   ts, date_label, author_key, captured_at)
			VALUES ($1,$2,$3,$4,'done',$5,$6,$7,$8,$9,$10,$11,$12)
			ON CONFLICT (id) DO NOTHING`,
			id, userID, project, blockType, title, summary,
			strOrNil(payload["source"]), strOrNil(payload["url"]),
			ts, now.Format("2 Jan"), authorKey, now,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
	}
}

// StoreRaw handles POST /api/v1/capture/raw — store a raw transcript for later processing.
func StoreRaw(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		var payload struct {
			Title      string `json:"title"`
			Source     string `json:"source"`
			URL        string `json:"url"`
			TurnCount  int    `json:"turnCount"`
			Transcript string `json:"transcript"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		id := fmt.Sprintf("raw-%d", time.Now().UnixMilli())
		_, err := database.Pool.Exec(c.Request.Context(), `
			INSERT INTO public.raw_captures (id, user_id, title, source, source_url, turn_count, transcript)
			VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			id, userID, payload.Title, payload.Source, payload.URL, payload.TurnCount, payload.Transcript,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
	}
}

// ListRaw handles GET /api/v1/capture/raw — unprocessed queue.
func ListRaw(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		rows, err := database.Pool.Query(c.Request.Context(), `
			SELECT id, title, source, source_url, turn_count, processed, captured_at
			FROM public.raw_captures
			WHERE user_id = $1 AND processed = false
			ORDER BY captured_at DESC LIMIT 50`,
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		type rawCapture struct {
			ID         string    `json:"id"`
			Title      string    `json:"title"`
			Source     string    `json:"source"`
			URL        *string   `json:"url,omitempty"`
			TurnCount  int       `json:"turnCount"`
			Processed  bool      `json:"processed"`
			CapturedAt time.Time `json:"captured_at"`
		}
		var out []rawCapture
		for rows.Next() {
			var r rawCapture
			rows.Scan(&r.ID, &r.Title, &r.Source, &r.URL, &r.TurnCount, &r.Processed, &r.CapturedAt)
			out = append(out, r)
		}
		if out == nil {
			out = []rawCapture{}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "count": len(out), "captures": out})
	}
}

// ProcessTranscript handles POST /api/v1/capture/process — Claude API extraction.
func ProcessTranscript(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload struct {
			Transcript string `json:"transcript" binding:"required"`
			RawID      string `json:"rawId"`
			Project    string `json:"project"`
			APIKey     string `json:"apiKey"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		apiKey := os.Getenv("ANTHROPIC_API_KEY")
		if apiKey == "" {
			apiKey = payload.APIKey
		}
		if apiKey == "" {
			c.JSON(http.StatusOK, gin.H{"ok": false, "fallback": true, "error": "No API key available"})
			return
		}

		extracted, err := extractWithClaude(apiKey, payload.Transcript)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Mark raw capture as processed
		if payload.RawID != "" {
			database.Pool.Exec(c.Request.Context(), `
				UPDATE public.raw_captures SET processed = true WHERE id = $1`,
				payload.RawID,
			)
		}

		project := payload.Project
		if project == "" {
			project = "Storyboard"
		}
		candidates := buildCandidates(extracted, project)

		c.JSON(http.StatusOK, gin.H{
			"ok":             true,
			"extracted":      extracted,
			"candidates":     candidates,
			"candidateCount": len(candidates),
		})
	}
}

// ConfirmCandidates handles POST /api/v1/capture/confirm — save approved blocks.
func ConfirmCandidates(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		var payload struct {
			Approved []map[string]any `json:"approved" binding:"required"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if len(payload.Approved) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "no approved blocks"})
			return
		}

		now := time.Now()
		ts := now.Year()*10000 + int(now.Month())*100 + now.Day()
		saved := 0
		for _, b := range payload.Approved {
			id := fmt.Sprintf("confirmed-%v-%d", b["type"], now.UnixNano())
			_, err := database.Pool.Exec(c.Request.Context(), `
				INSERT INTO public.blocks (id, user_id, project_name, type, status, title, ts, date_label, is_live, captured_at)
				VALUES ($1,$2,$3,$4,'done',$5,$6,$7,true,$8)
				ON CONFLICT (id) DO NOTHING`,
				id, userID, strVal(b, "project"), strVal(b, "type"), strVal(b, "title"), ts, now.Format("2 Jan"), now,
			)
			if err == nil {
				saved++
			}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "saved": saved})
	}
}

// Preview handles POST /api/v1/capture/preview — log a preview-shown event.
func Preview(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		var payload struct {
			URL     string `json:"url"`
			File    string `json:"file"`
			Project string `json:"project"`
			Context string `json:"context"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		now := time.Now()
		id := fmt.Sprintf("preview-%d", now.UnixMilli())
		label := payload.File
		if label == "" && payload.URL != "" {
			label = payload.URL
		}
		title := "Preview shown: " + label

		_, err := database.Pool.Exec(c.Request.Context(), `
			INSERT INTO public.blocks (id, user_id, project_name, type, status, title, summary, source_url, ts, date_label, captured_at)
			VALUES ($1,$2,$3,'preview','done',$4,$5,$6,$7,$8,$9)
			ON CONFLICT (id) DO NOTHING`,
			id, userID, payload.Project, title, payload.Context, payload.URL,
			now.Year()*10000+int(now.Month())*100+now.Day(), now.Format("2 Jan"), now,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
	}
}

// Screenshot handles POST /api/v1/capture/screenshot — save base64 PNG.
// In Phase 2 this stores to local disk. Phase 6 migrates to Supabase Storage.
func Screenshot(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload struct {
			DataURL  string `json:"dataUrl" binding:"required"`
			Filename string `json:"filename"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		b64 := strings.TrimPrefix(payload.DataURL, "data:image/png;base64,")
		b64 = strings.TrimPrefix(b64, "data:image/jpeg;base64,")
		imgBytes, err := base64.StdEncoding.DecodeString(b64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid base64"})
			return
		}

		fname := payload.Filename
		if fname == "" {
			fname = fmt.Sprintf("screenshot-%d.png", time.Now().UnixMilli())
		}
		// TODO Phase 6: upload to Supabase Storage instead of local disk
		path := "/tmp/storyboard-screenshots/" + fname
		if err := os.WriteFile(path, imgBytes, 0644); err != nil {
			// non-fatal — screenshots are nice-to-have
			c.JSON(http.StatusOK, gin.H{"ok": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "saved": path})
	}
}

// ── helpers ────────────────────────────────────────────────────────────────────

func inferProject(c *gin.Context, database *db.DB, userID string) string {
	var name string
	database.Pool.QueryRow(c.Request.Context(), `
		SELECT project_name FROM public.blocks
		WHERE user_id = $1 AND is_live = true
		ORDER BY captured_at DESC LIMIT 1`,
		userID,
	).Scan(&name)
	if name == "" {
		return "Storyboard"
	}
	return name
}

func buildSummary(p map[string]any) *string {
	var parts []string
	if s, _ := p["summary"].(string); s != "" {
		parts = append(parts, s)
	}
	if ctx, _ := p["context"].(string); ctx != "" {
		source, _ := p["source"].(string)
		if source == "" {
			source = "browser"
		}
		if len(ctx) > 600 {
			ctx = ctx[:600]
		}
		parts = append(parts, "[Context from "+source+"]\n"+ctx)
	}
	if len(parts) == 0 {
		return nil
	}
	s := strings.Join(parts, "\n\n")
	return &s
}

func strOrNil(v any) *string {
	s, _ := v.(string)
	if s == "" {
		return nil
	}
	return &s
}

func strVal(m map[string]any, key string) string {
	v, _ := m[key].(string)
	return v
}

type claudeExtracted struct {
	Decisions        []string                 `json:"decisions"`
	Ideas            []string                 `json:"ideas"`
	Rejections       []map[string]string      `json:"rejections"`
	Intent           string                   `json:"intent"`
	KeyMoments       []string                 `json:"keyMoments"`
	SuggestedTitle   string                   `json:"suggestedTitle"`
	DiscussionSummary string                  `json:"discussionSummary"`
}

func extractWithClaude(apiKey, transcript string) (*claudeExtracted, error) {
	if len(transcript) > 12000 {
		transcript = transcript[:12000]
	}

	systemPrompt := `You are a Storyboard content extractor. Read the AI conversation transcript and extract structured information.

Return ONLY valid JSON in this exact format:
{
  "decisions": ["string", ...],
  "ideas": ["string", ...],
  "rejections": [{"title": "string", "reason": "string", "replacedBy": "string or null"}, ...],
  "intent": "string or null",
  "keyMoments": ["string", ...],
  "suggestedTitle": "string",
  "discussionSummary": "2-3 sentence narrative summary of what happened in this conversation"
}

Rules:
- decisions: things explicitly decided, agreed on, or locked in (max 8)
- ideas: suggestions, possibilities, things to explore later (max 6)
- rejections: things explicitly dismissed or rejected (max 5)
- intent: the overarching goal or direction (one sentence)
- keyMoments: turning points, insights, breakthroughs (max 4)
- suggestedTitle: short title for this conversation (max 60 chars)
- discussionSummary: 2-3 sentences`

	body, _ := json.Marshal(map[string]any{
		"model":      "claude-haiku-4-5-20251001",
		"max_tokens": 1024,
		"system":     systemPrompt,
		"messages":   []map[string]any{{"role": "user", "content": "Extract from this conversation:\n\n" + transcript}},
	})

	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBytes, _ := io.ReadAll(resp.Body)

	var apiResp struct {
		Content []struct{ Text string `json:"text"` } `json:"content"`
	}
	if err := json.Unmarshal(respBytes, &apiResp); err != nil || len(apiResp.Content) == 0 {
		return nil, fmt.Errorf("unexpected Claude API response")
	}

	raw := apiResp.Content[0].Text
	raw = strings.TrimPrefix(raw, "```json\n")
	raw = strings.TrimSuffix(raw, "\n```")
	raw = strings.TrimSpace(raw)

	var out claudeExtracted
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, fmt.Errorf("failed to parse Claude response: %w", err)
	}
	return &out, nil
}

func buildCandidates(e *claudeExtracted, project string) []map[string]any {
	now := time.Now()
	ts := now.Year()*10000 + int(now.Month())*100 + now.Day()
	date := now.Format("2 Jan")

	var out []map[string]any
	if e.Intent != "" {
		out = append(out, map[string]any{"type": "intent", "title": e.Intent, "project": project, "date": date, "ts": ts, "_candidate": true})
	}
	for _, d := range e.Decisions {
		out = append(out, map[string]any{"type": "decision", "title": d, "project": project, "date": date, "ts": ts, "_candidate": true})
	}
	for _, i := range e.Ideas {
		out = append(out, map[string]any{"type": "idea", "title": i, "project": project, "date": date, "ts": ts, "heat": "hot", "_candidate": true})
	}
	for _, r := range e.Rejections {
		out = append(out, map[string]any{"type": "rejection", "title": r["title"], "summary": r["reason"], "replacedBy": r["replacedBy"], "project": project, "date": date, "ts": ts, "_candidate": true})
	}
	return out
}
