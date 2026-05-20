# Storyboard Browser Extension — Install

## Requirements
- Google Chrome (or any Chromium browser)
- Storyboard MCP server running: `node mcp-server.js` (in the storyboard folder)

## Install in Chrome (Developer Mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The ⬡ Storyboard icon appears in your toolbar

## How to use

1. Open any AI tool tab — Claude, ChatGPT, Gemini, Perplexity, etc.
2. Click the ⬡ icon in your Chrome toolbar
3. The popup auto-detects the tool and pre-fills the conversation title
4. Pick a block type (Session / Decision / Idea / Feature)
5. Select your project
6. Click **Capture to Storyboard**
7. The block appears instantly in your storyboard dashboard

## Supported AI tools
- claude.ai
- chatgpt.com / chat.openai.com
- gemini.google.com
- perplexity.ai
- aistudio.google.com
- cursor.com
- replit.com
- copilot.microsoft.com

## How it works
The extension reads the page title and recent conversation text from the DOM.
It sends the block directly to the MCP server running locally at `localhost:3847`.
No cloud, no account — everything stays on your machine.
