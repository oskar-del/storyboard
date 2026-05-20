# Storyboard

> The AI memory layer. Captures every session, decision, and idea — then seeds any new chat with complete project context.

## Monorepo structure

```
apps/
  web/    — Next.js 15 frontend (deployed to Vercel)
  api/    — Go + Gin backend (deployed to Railway)
  mcp/    — Node.js MCP server (installed locally via Claude Desktop / Cursor)

browser-extension/  — Chrome extension (captures from Claude, ChatGPT, Gemini, etc.)
supabase/           — Database migrations and config
infra/              — Railway config, env templates, migration scripts
legacy/             — Original single-file implementation (preserved for reference)
```

## Quick start (development)

### Prerequisites
- Node.js 20+
- Go 1.22+
- Supabase CLI (`brew install supabase/tap/supabase`)

### 1. Start Supabase locally
```bash
supabase start
supabase db push
```

### 2. Start the Go API
```bash
cd apps/api
cp ../../infra/.env.example .env   # fill in values
go run ./cmd/server
# → http://localhost:8080
```

### 3. Start the Next.js frontend
```bash
cd apps/web
cp ../../infra/.env.example .env.local  # fill in NEXT_PUBLIC_ vars
npm install
npm run dev
# → http://localhost:3000
```

### 4. Run the MCP server locally
```bash
cd apps/mcp
npm install
STORYBOARD_API_URL=http://localhost:8080 \
STORYBOARD_TOKEN=<your-token> \
STORYBOARD_AUTHOR=oskar \
node mcp-server.js
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "storyboard": {
      "command": "node",
      "args": ["/path/to/apps/mcp/mcp-server.js"],
      "env": {
        "STORYBOARD_API_URL": "http://localhost:8080",
        "STORYBOARD_TOKEN": "<your-token>",
        "STORYBOARD_AUTHOR": "oskar"
      }
    }
  }
}
```

## Deploy

| Service | Platform | Config |
|---|---|---|
| `apps/web` | Vercel | connect repo root, set framework to Next.js, set `NEXT_PUBLIC_API_URL` |
| `apps/api` | Railway | `infra/railway.toml`, set env vars from `.env.example` |
| Supabase | Supabase Cloud | `supabase link`, `supabase db push` |

## Data migration (one-time)

If you have existing data in JSON files or the Dropbox vault:
```bash
cd infra/scripts
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=<key> \
STORYBOARD_AUTHOR=oskar \
COLLAB_PROJECTS=Storyboard \
node migrate-json-to-supabase.js
```
