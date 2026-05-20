#!/bin/bash
# One-time install — makes Storyboard MCP server start automatically on login
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_SRC="$SCRIPT_DIR/com.storyboard.mcp-server.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.storyboard.mcp-server.plist"

# Find node path
NODE_PATH="$(which node)"
if [ -z "$NODE_PATH" ]; then
  echo "❌ Node not found. Install Node.js first."
  exit 1
fi

# Write the plist with real paths
cat > "$PLIST_DST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.storyboard.mcp-server</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_PATH</string>
    <string>$SCRIPT_DIR/mcp-server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$SCRIPT_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$SCRIPT_DIR/mcp-server.log</string>
  <key>StandardErrorPath</key>
  <string>$SCRIPT_DIR/mcp-server.log</string>
</dict>
</plist>
EOF

# Load it now (starts immediately, and on every future login)
launchctl load "$PLIST_DST"
echo "✅ Storyboard server will now start automatically on login"
echo "   Starting it now..."
launchctl start com.storyboard.mcp-server
echo "✅ Server running on http://127.0.0.1:3847"
