// Package invites handles sending email invitations via the Supabase Admin API.
// The service role key lives only in the Go API env — never in the browser.
package invites

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/db"
)

// Config holds the Supabase credentials needed to call the Admin API.
type Config struct {
	SupabaseURL        string // e.g. https://evnyygqsnaqnxytusevd.supabase.co
	SupabaseServiceKey string // service_role key
}

// Send handles POST /api/v1/invites
// Body: { "email": "user@example.com" }
//
// Only authenticated users can send invites (they must be logged in themselves).
// The invited user will receive a Supabase invite email with a magic link that
// lands on /auth/callback, creates their profile, and drops them into /canvas.
func Send(database *db.DB, cfg Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Who is sending the invite?
		senderID := auth.UserID(c)
		if senderID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		var payload struct {
			Email string `json:"email" binding:"required"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email is required"})
			return
		}

		email := strings.ToLower(strings.TrimSpace(payload.Email))
		if !strings.Contains(email, "@") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email address"})
			return
		}

		// Check the invite recipient isn't already a user
		var existingID string
		_ = database.Pool.QueryRow(c.Request.Context(),
			`SELECT id FROM public.profiles WHERE id IN (
				SELECT id FROM auth.users WHERE email = $1
			)`, email,
		).Scan(&existingID)

		if existingID != "" {
			c.JSON(http.StatusConflict, gin.H{"error": "user with this email already exists"})
			return
		}

		// Call Supabase Admin API to send the invite email
		if err := sendSupabaseInvite(c.Request.Context(), cfg, email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("invite failed: %s", err.Error())})
			return
		}

		// Log the invite in the DB so we can track who invited whom
		_, _ = database.Pool.Exec(c.Request.Context(),
			`INSERT INTO public.invites (invited_by, email, sent_at)
			 VALUES ($1, $2, now())
			 ON CONFLICT (email) DO UPDATE SET invited_by = $1, sent_at = now()`,
			senderID, email,
		)

		c.JSON(http.StatusOK, gin.H{"ok": true, "email": email})
	}
}

// List handles GET /api/v1/invites — returns pending invites sent by the current user.
func List(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := auth.UserID(c)
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		rows, err := database.Pool.Query(c.Request.Context(),
			`SELECT email, sent_at FROM public.invites
			 WHERE invited_by = $1
			 ORDER BY sent_at DESC`, userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		type invite struct {
			Email  string    `json:"email"`
			SentAt time.Time `json:"sent_at"`
		}
		var list []invite
		for rows.Next() {
			var inv invite
			if err := rows.Scan(&inv.Email, &inv.SentAt); err == nil {
				list = append(list, inv)
			}
		}
		if list == nil {
			list = []invite{}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "invites": list})
	}
}

// ── Supabase Admin API call ───────────────────────────────────────────────────

func sendSupabaseInvite(ctx context.Context, cfg Config, email string) error {
	body, _ := json.Marshal(map[string]string{"email": email})

	req, err := http.NewRequestWithContext(ctx,
		http.MethodPost,
		cfg.SupabaseURL+"/auth/v1/admin/invite",
		bytes.NewReader(body),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.SupabaseServiceKey)
	req.Header.Set("apikey", cfg.SupabaseServiceKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase admin API %d: %s", resp.StatusCode, string(raw))
	}
	return nil
}
