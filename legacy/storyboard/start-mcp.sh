#!/bin/bash
# Finds node wherever it is and starts the MCP server
NODE=$(which node 2>/dev/null)
if [ -z "$NODE" ]; then
  for p in /opt/homebrew/bin/node /usr/local/bin/node ~/.nvm/versions/node/*/bin/node; do
    [ -f "$p" ] && NODE="$p" && break
  done
fi
exec "$NODE" "/Users/oskarpeterson/Documents/AI/AGENCY /storyboard/mcp-server.js"
