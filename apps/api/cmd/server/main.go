package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/storyboard/api/internal/auth"
	"github.com/storyboard/api/internal/blocks"
	"github.com/storyboard/api/internal/capture"
	"github.com/storyboard/api/internal/db"
	"github.com/storyboard/api/internal/export"
	"github.com/storyboard/api/internal/projects"
	"github.com/storyboard/api/internal/session"
	"github.com/storyboard/api/internal/skills"
	"github.com/storyboard/api/internal/waitlist"
)

func main() {
	database, err := db.Connect(mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer database.Close()

	jwtSecret := mustEnv("JWT_SECRET")
	authMW := auth.Middleware(jwtSecret)

	r := gin.Default()
	r.Use(corsMiddleware())

	// ── Public ─────────────────────────────────────────────────────────────────
	r.GET("/ping", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true, "version": "2.0.0"}) })

	r.POST("/api/v1/waitlist", waitlist.Create(database))
	r.GET("/api/v1/waitlist", auth.ServiceOnly(jwtSecret), waitlist.List(database))

	// Session bootstrap is called by the browser extension before auth is set up.
	// It uses the service token (STORYBOARD_TOKEN), not a user JWT.
	r.GET("/api/v1/session/bootstrap", auth.ServiceOnly(jwtSecret), session.Bootstrap(database))

	// ── Authenticated ─────────────────────────────────────────────────────────
	v1 := r.Group("/api/v1", authMW)
	{
		// Blocks
		v1.GET("/blocks", blocks.List(database))
		v1.POST("/blocks", blocks.Create(database))
		v1.GET("/blocks/:id", blocks.Get(database))
		v1.PATCH("/blocks/:id", blocks.Update(database))

		// Projects
		v1.GET("/projects", projects.List(database))

		// Session
		v1.GET("/session/start", session.Start(database))
		v1.GET("/session/seed", session.Seed(database))

		// Capture pipeline
		v1.POST("/capture/web", capture.Web(database))
		v1.POST("/capture/raw", capture.StoreRaw(database))
		v1.GET("/capture/raw", capture.ListRaw(database))
		v1.POST("/capture/process", capture.ProcessTranscript(database))
		v1.POST("/capture/confirm", capture.ConfirmCandidates(database))
		v1.POST("/capture/preview", capture.Preview(database))
		v1.POST("/capture/screenshot", capture.Screenshot(database))

		// Skills
		v1.GET("/skills", skills.List(database))
		v1.POST("/skills/score", skills.Score(database))

		// Export
		v1.GET("/export", export.Full(database))

		// Sync (replaces git push + populate)
		v1.POST("/sync/push", session.SyncPush(database))
		v1.GET("/sync/status", session.SyncStatus(database))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Storyboard API listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Storyboard-Author")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
