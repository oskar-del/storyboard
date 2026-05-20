package waitlist

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/db"
)

// Create handles POST /api/v1/waitlist — no auth required.
func Create(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload struct {
			Email  string `json:"email" binding:"required"`
			Source string `json:"source"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		email := strings.ToLower(strings.TrimSpace(payload.Email))
		if !strings.Contains(email, "@") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email"})
			return
		}

		source := payload.Source
		if source == "" {
			source = "landing"
		}

		var count int
		database.Pool.QueryRow(c.Request.Context(), `SELECT count(*) FROM public.waitlist`).Scan(&count)

		_, err := database.Pool.Exec(c.Request.Context(), `
			INSERT INTO public.waitlist (email, source)
			VALUES ($1, $2)
			ON CONFLICT (email) DO NOTHING`,
			email, source,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Re-count after upsert
		database.Pool.QueryRow(c.Request.Context(), `SELECT count(*) FROM public.waitlist`).Scan(&count)
		c.JSON(http.StatusOK, gin.H{"ok": true, "count": count})
	}
}

// List handles GET /api/v1/waitlist — requires service token.
func List(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := database.Pool.Query(c.Request.Context(), `
			SELECT email, source, signed_up_at FROM public.waitlist ORDER BY signed_up_at DESC`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		type entry struct {
			Email      string    `json:"email"`
			Source     string    `json:"source"`
			SignedUpAt time.Time `json:"signed_up_at"`
		}
		var signups []entry
		for rows.Next() {
			var e entry
			rows.Scan(&e.Email, &e.Source, &e.SignedUpAt)
			signups = append(signups, e)
		}
		if signups == nil {
			signups = []entry{}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "count": len(signups), "signups": signups})
	}
}
