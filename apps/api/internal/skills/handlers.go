package skills

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/db"
)

type Skill struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Category     *string    `json:"category,omitempty"`
	Score        int        `json:"score"`
	LastScoredAt *time.Time `json:"last_scored_at,omitempty"`
}

func List(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		rows, err := database.Pool.Query(c.Request.Context(), `
			SELECT id, name, category, score, last_scored_at
			FROM public.skills WHERE user_id = $1
			ORDER BY score DESC`,
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var skills []Skill
		for rows.Next() {
			var s Skill
			rows.Scan(&s.ID, &s.Name, &s.Category, &s.Score, &s.LastScoredAt)
			skills = append(skills, s)
		}
		if skills == nil {
			skills = []Skill{}
		}
		c.JSON(http.StatusOK, skills)
	}
}

// Score re-scores all skills based on recent block activity.
// A skill's score = count of blocks in the last 30 days whose chips or title
// contain the skill name (case-insensitive). This replaces score_skills.py.
func Score(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		cutoff := time.Now().AddDate(0, 0, -30)

		// Fetch all blocks from last 30 days
		rows, err := database.Pool.Query(c.Request.Context(), `
			SELECT title, coalesce(array_to_string(chips, ' '), '') as chip_text
			FROM public.blocks
			WHERE user_id = $1 AND captured_at >= $2 AND is_candidate = false`,
			userID, cutoff,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		// Count keyword hits per block
		wordCounts := map[string]int{}
		for rows.Next() {
			var title, chipText string
			rows.Scan(&title, &chipText)
			text := title + " " + chipText
			// Simple word tokenization
			for _, word := range splitWords(text) {
				if len(word) > 3 {
					wordCounts[word]++
				}
			}
		}

		// Fetch existing skills and update scores
		skillRows, err := database.Pool.Query(c.Request.Context(), `
			SELECT id, name FROM public.skills WHERE user_id = $1`,
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer skillRows.Close()

		type skillUpdate struct{ id, name string }
		var skills []skillUpdate
		for skillRows.Next() {
			var s skillUpdate
			skillRows.Scan(&s.id, &s.name)
			skills = append(skills, s)
		}

		now := time.Now()
		updated := 0
		for _, s := range skills {
			score := wordCounts[normalizeWord(s.name)]
			database.Pool.Exec(c.Request.Context(), `
				UPDATE public.skills SET score = $1, last_scored_at = $2 WHERE id = $3`,
				score, now, s.id,
			)
			updated++
		}

		c.JSON(http.StatusOK, gin.H{
			"ok":      true,
			"message": "Skills scored",
			"updated": updated,
			"scoredAt": now.Format(time.RFC3339),
		})
	}
}

func splitWords(s string) []string {
	var words []string
	var cur []rune
	for _, r := range s {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' {
			cur = append(cur, r)
		} else {
			if len(cur) > 0 {
				words = append(words, string(cur))
				cur = cur[:0]
			}
		}
	}
	if len(cur) > 0 {
		words = append(words, string(cur))
	}
	return words
}

func normalizeWord(s string) string {
	lower := []rune(s)
	for i, r := range lower {
		if r >= 'A' && r <= 'Z' {
			lower[i] = r + 32
		}
	}
	return string(lower)
}
