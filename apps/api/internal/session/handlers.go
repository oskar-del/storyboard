package session

import (
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/db"
)

// Start returns the session brief — same data as the session_start MCP tool.
func Start(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		brief, err := buildBrief(c, database, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, brief)
	}
}

// Bootstrap returns the full auto-seed payload for the Chrome extension.
func Bootstrap(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		brief, err := buildBrief(c, database, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		seed := buildSeedPrompt(brief)
		c.JSON(http.StatusOK, gin.H{
			"ok":                 true,
			"generated":          time.Now().Format(time.RFC3339),
			"activeProject":      brief["hottestProject"],
			"blockCounts":        brief["blockCounts"],
			"recentBlocks":       brief["recentBlocks"],
			"decisions":          brief["lastDecisions"],
			"ideas":              brief["pendingIdeas"],
			"seedPrompt":         seed,
			"dashboardUrl":       "https://app.storyboard.app",
		})
	}
}

// Seed returns a context seed string (for get_context_seed MCP tool).
func Seed(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		project := c.Query("project")
		format := c.Query("format")
		category := c.Query("category")
		if format == "" {
			format = "full"
		}

		blocks, err := queryBlocks(c, database, userID, project, 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		allBlocks, _ := queryBlocks(c, database, userID, "", 500)
		projectCounts := map[string]int{}
		for _, b := range allBlocks {
			projectCounts[b.ProjectName]++
		}

		ideas := filterByType(allBlocks, "idea", "not_started", project, 8)
		decisions := flattenDecisions(blocks, 8)

		catLabel := "All Projects"
		if project != "" {
			catLabel = project
		}
		if category != "" && category != "" {
			blocks = filterByCategory(blocks, category)
			catLabel = category
		}

		lines := []string{
			fmt.Sprintf("# Session Seed — %s — %s", catLabel, time.Now().Format("2 Jan 15:04")),
			"",
			"## Active Projects",
		}
		for p, cnt := range projectCounts {
			lines = append(lines, fmt.Sprintf("- %s: %d blocks", p, cnt))
		}
		lines = append(lines, "", "## Recent Work (last 10 blocks)")
		for _, b := range blocks {
			lines = append(lines, fmt.Sprintf("- [%s] %s → %s", b.Status, b.ProjectName, b.Title))
		}
		lines = append(lines, "", "## Key Decisions Carrying Forward")
		if len(decisions) == 0 {
			lines = append(lines, "None recorded")
		}
		for i, d := range decisions {
			lines = append(lines, fmt.Sprintf("%d. %s", i+1, d))
		}
		lines = append(lines, "", "## Ideas — Not Yet Acted On")
		for _, b := range ideas {
			lines = append(lines, fmt.Sprintf("💡 %s: %s", b.ProjectName, strings.TrimPrefix(b.Title, "💡 ")))
		}
		if format == "brief" {
			// Truncate to ~300 words
			full := strings.Join(lines, "\n")
			words := strings.Fields(full)
			if len(words) > 250 {
				words = words[:250]
			}
			c.JSON(http.StatusOK, gin.H{"seed": strings.Join(words, " ")})
			return
		}

		c.JSON(http.StatusOK, gin.H{"seed": strings.Join(lines, "\n")})
	}
}

// SyncPush triggers a Supabase Storage backup snapshot.
func SyncPush(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Phase 3: returns a no-op success.
		// Phase 6: will call Supabase Storage to upload a backup JSON.
		c.JSON(http.StatusOK, gin.H{
			"ok":      true,
			"message": "Sync is now automatic via Supabase. No action needed.",
		})
	}
}

// SyncStatus returns block count + last backup time.
func SyncStatus(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		var count int
		database.Pool.QueryRow(c.Request.Context(),
			`SELECT count(*) FROM public.blocks WHERE user_id = $1 AND is_candidate = false`,
			userID,
		).Scan(&count)
		c.JSON(http.StatusOK, gin.H{
			"ok":           true,
			"totalBlocks":  count,
			"lastBackupAt": nil,
			"dirty":        false,
		})
	}
}

// ── helpers ───────────────────────────────────────────────────────────────────

type blockRow struct {
	ID          string
	ProjectName string
	Type        string
	Status      string
	Title       string
	Summary     string
	Decisions   []string
	TS          int
	CapturedAt  time.Time
}

func queryBlocks(c *gin.Context, database *db.DB, userID, project string, limit int) ([]blockRow, error) {
	q := `SELECT b.id, b.project_name, b.type, b.status, b.title,
	             coalesce(b.summary,''), coalesce(b.decisions, ARRAY[]::text[]), coalesce(b.ts,0), b.captured_at
	      FROM public.blocks b
	      WHERE (b.user_id = $1 OR b.project_id IN (
	               SELECT project_id FROM public.project_members WHERE user_id = $1))
	        AND b.is_candidate = false`
	args := []any{userID}
	i := 2
	if project != "" {
		q += fmt.Sprintf(" AND b.project_name = $%d", i)
		args = append(args, project)
		i++
	}
	q += fmt.Sprintf(" ORDER BY b.captured_at DESC LIMIT $%d", i)
	args = append(args, limit)

	rows, err := database.Pool.Query(c.Request.Context(), q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []blockRow
	for rows.Next() {
		var b blockRow
		rows.Scan(&b.ID, &b.ProjectName, &b.Type, &b.Status, &b.Title, &b.Summary, &b.Decisions, &b.TS, &b.CapturedAt)
		out = append(out, b)
	}
	return out, rows.Err()
}

func buildBrief(c *gin.Context, database *db.DB, userID string) (map[string]any, error) {
	now := time.Now()
	todayTS := now.Year()*10000 + int(now.Month())*100 + now.Day()
	sevenDaysAgo := todayTS - 7

	blocks, err := queryBlocks(c, database, userID, "", 200)
	if err != nil {
		return nil, err
	}

	var lastSession *blockRow
	recentCounts := map[string]int{}
	var pendingIdeas []map[string]string
	var inProgress []map[string]string
	todayCount := 0

	for i := range blocks {
		b := &blocks[i]
		if b.TS >= todayTS {
			todayCount++
		}
		if b.TS >= sevenDaysAgo {
			recentCounts[b.ProjectName]++
		}
		if b.Type == "session" && lastSession == nil {
			lastSession = b
		}
		if b.Type == "idea" && b.Status == "not_started" && len(pendingIdeas) < 3 {
			pendingIdeas = append(pendingIdeas, map[string]string{"title": strings.TrimPrefix(b.Title, "💡 "), "project": b.ProjectName})
		}
		if b.Status == "in_progress" && len(inProgress) < 3 {
			inProgress = append(inProgress, map[string]string{"title": b.Title, "project": b.ProjectName})
		}
	}

	hottestProject := ""
	hottestCount := 0
	for p, cnt := range recentCounts {
		if cnt > hottestCount {
			hottestProject = p
			hottestCount = cnt
		}
	}

	// Sprint day from April 15 2026
	sprintStart := time.Date(2026, 4, 15, 0, 0, 0, 0, time.UTC)
	sprintDay := int(math.Min(10, math.Max(1, math.Floor(now.Sub(sprintStart).Hours()/24)+1)))

	var lastSessionInfo map[string]string
	var lastDecisions []string
	if lastSession != nil {
		lastSessionInfo = map[string]string{
			"title":   lastSession.Title,
			"project": lastSession.ProjectName,
		}
		lastDecisions = lastSession.Decisions
		if len(lastDecisions) > 3 {
			lastDecisions = lastDecisions[:3]
		}
	}

	typeCounts := map[string]int{}
	for _, b := range blocks {
		typeCounts[b.Type]++
	}

	recent8 := []map[string]string{}
	for i, b := range blocks {
		if i >= 8 {
			break
		}
		sum := b.Summary
		if len(sum) > 120 {
			sum = sum[:120]
		}
		recent8 = append(recent8, map[string]string{
			"id": b.ID, "type": b.Type, "title": b.Title, "project": b.ProjectName, "summary": sum,
		})
	}

	return map[string]any{
		"sprintDay":      sprintDay,
		"lastSession":    lastSessionInfo,
		"lastDecisions":  lastDecisions,
		"hottestProject": hottestProject,
		"todayCount":     todayCount,
		"pendingIdeas":   pendingIdeas,
		"inProgress":     inProgress,
		"totalBlocks":    len(blocks),
		"blockCounts":    gin.H{"total": len(blocks), "byType": typeCounts},
		"recentBlocks":   recent8,
	}, nil
}

func buildSeedPrompt(brief map[string]any) string {
	lines := []string{
		fmt.Sprintf("═══ STORYBOARD AUTO-SEED · %s ═══", time.Now().Format("2 January 2006")),
	}
	if h, ok := brief["hottestProject"].(string); ok && h != "" {
		lines = append(lines, fmt.Sprintf("Active project: %s", h))
	}
	if total, ok := brief["totalBlocks"].(int); ok {
		lines = append(lines, fmt.Sprintf("Total blocks: %d", total))
	}
	lines = append(lines, "", "── RECENT WORK ──")
	if recent, ok := brief["recentBlocks"].([]map[string]string); ok {
		icons := map[string]string{"session": "◈", "decision": "✓", "idea": "💡", "intent": "🎯", "rejection": "✕"}
		for _, b := range recent {
			icon := icons[b["type"]]
			if icon == "" {
				icon = "•"
			}
			lines = append(lines, fmt.Sprintf("  %s [%s] %s", icon, b["project"], b["title"]))
		}
	}
	lines = append(lines, "", "═══ Ready. Context windows end. Intent doesn't. ═══")
	return strings.Join(lines, "\n")
}

func filterByType(blocks []blockRow, blockType, status, project string, limit int) []blockRow {
	var out []blockRow
	for _, b := range blocks {
		if b.Type != blockType {
			continue
		}
		if status != "" && b.Status != status {
			continue
		}
		if project != "" && b.ProjectName != project {
			continue
		}
		out = append(out, b)
		if len(out) >= limit {
			break
		}
	}
	return out
}

func flattenDecisions(blocks []blockRow, limit int) []string {
	var out []string
	for _, b := range blocks {
		for _, d := range b.Decisions {
			out = append(out, d)
			if len(out) >= limit {
				return out
			}
		}
	}
	return out
}

var catKeywords = map[string][]string{
	"Content":    {"blog", "article", "post", "copy", "write", "content", "landing", "newsletter", "email", "draft"},
	"SEO":        {"seo", "keyword", "rank", "search", "meta", "sitemap", "hreflang", "index", "crawl", "traffic"},
	"Dev":        {"build", "code", "deploy", "fix", "refactor", "debug", "endpoint", "api", "server", "component"},
	"Marketing":  {"campaign", "ad", "social", "paid", "instagram", "facebook", "tiktok", "linkedin", "brand"},
	"Legal":      {"gdpr", "contract", "terms", "privacy", "compliance", "legal", "regulation", "law", "tax"},
	"Client":     {"client", "lead", "meeting", "call", "proposal", "pitch", "deal", "follow", "crm"},
	"Automation": {"automate", "automation", "workflow", "schedule", "trigger", "mcp", "script", "pipeline"},
}

func filterByCategory(blocks []blockRow, category string) []blockRow {
	kws, ok := catKeywords[category]
	if !ok {
		return blocks
	}
	var out []blockRow
	for _, b := range blocks {
		text := strings.ToLower(b.Title + " " + b.Summary)
		for _, kw := range kws {
			if strings.Contains(text, kw) {
				out = append(out, b)
				break
			}
		}
	}
	return out
}
