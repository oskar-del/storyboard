package projects

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/db"
)

type Project struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	NorthStar *string   `json:"north_star,omitempty"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
	// Computed stats
	TotalBlocks int            `json:"total_blocks"`
	ByType      map[string]int `json:"by_type"`
}

func List(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)

		rows, err := database.Pool.Query(c.Request.Context(), `
			SELECT p.id, p.name, p.north_star, p.color, p.created_at,
			       count(b.id) as total_blocks
			FROM public.projects p
			LEFT JOIN public.blocks b ON b.project_id = p.id AND b.is_candidate = false
			WHERE p.owner_id = $1
			   OR p.id IN (SELECT project_id FROM public.project_members WHERE user_id = $1)
			GROUP BY p.id
			ORDER BY total_blocks DESC`,
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var projects []Project
		for rows.Next() {
			var p Project
			if err := rows.Scan(&p.ID, &p.Name, &p.NorthStar, &p.Color, &p.CreatedAt, &p.TotalBlocks); err != nil {
				continue
			}
			p.ByType = blocksByType(c.Request.Context(), database, userID, p.ID)
			projects = append(projects, p)
		}
		if projects == nil {
			projects = []Project{}
		}
		c.JSON(http.StatusOK, projects)
	}
}

func blocksByType(ctx context.Context, database *db.DB, userID, projectID string) map[string]int {
	rows, err := database.Pool.Query(ctx, `
		SELECT type, count(*) FROM public.blocks
		WHERE project_id = $1 AND is_candidate = false
		GROUP BY type`,
		projectID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var t string
		var n int
		if err := rows.Scan(&t, &n); err == nil {
			out[t] = n
		}
	}
	return out
}
