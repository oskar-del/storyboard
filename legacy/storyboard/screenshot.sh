#!/bin/bash
# Storyboard Screenshot Engine
# Runs on YOUR machine (not the sandbox) — uses Chrome headless
# Usage: bash screenshot.sh
# Or run automatically: bash screenshot.sh --watch

STORYBOARD_DIR="$(cd "$(dirname "$0")" && pwd)"
THUMBNAILS_DIR="$STORYBOARD_DIR/thumbnails"
mkdir -p "$THUMBNAILS_DIR"

# Find Chrome on Mac
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ ! -f "$CHROME" ]; then
  CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"
fi
if [ ! -f "$CHROME" ]; then
  echo "❌ Chrome not found. Install Chrome or update CHROME path in this script."
  exit 1
fi

echo "🎬 Storyboard Screenshot Engine"
echo "📸 Chrome: $CHROME"
echo "📁 Thumbnails: $THUMBNAILS_DIR"
echo ""

screenshot_html() {
  local html_file="$1"
  local name="$2"
  local output="$THUMBNAILS_DIR/${name}.png"

  echo "📸 Screenshotting: $name"
  "$CHROME" \
    --headless \
    --disable-gpu \
    --screenshot="$output" \
    --window-size=1280,800 \
    --hide-scrollbars \
    "file://$html_file" 2>/dev/null

  if [ -f "$output" ]; then
    echo "   ✅ Saved: thumbnails/${name}.png"
    # Also make a small version (320x200) using sips (built into macOS)
    sips -Z 320 "$output" --out "$THUMBNAILS_DIR/${name}-sm.png" 2>/dev/null
  else
    echo "   ❌ Failed: $name"
  fi
}

# ── SCREENSHOT KNOWN FILES ────────────────────────────────────────

# Storyboard dashboard itself
screenshot_html "$STORYBOARD_DIR/index.html" "storyboard-dashboard"

# Opero landing page
OPERO_HTML="/Users/oskarpeterson/mnt/AGENCY /opero-landing-mvp.html"
if [ -f "$OPERO_HTML" ]; then
  screenshot_html "$OPERO_HTML" "opero-landing"
fi

# Opero agency map
OPERO_MAP="/Users/oskarpeterson/mnt/AGENCY /Opero-Agency-Map.html"
if [ -f "$OPERO_MAP" ]; then
  screenshot_html "$OPERO_MAP" "opero-agency-map"
fi

# Foxtons demo
FOXTONS="/Users/oskarpeterson/mnt/AGENCY /foxtons-demo.html"
if [ -f "$FOXTONS" ]; then
  screenshot_html "$FOXTONS" "foxtons-demo"
fi

# Auto-discover any HTML files in AGENCY folder
echo ""
echo "🔍 Auto-discovering HTML files..."
find "/Users/oskarpeterson/mnt/AGENCY " -name "*.html" -not -path "*/node_modules/*" 2>/dev/null | while read f; do
  name=$(basename "$f" .html)
  if [ ! -f "$THUMBNAILS_DIR/${name}.png" ]; then
    screenshot_html "$f" "$name"
  fi
done

echo ""
echo "✅ Done. Open the Storyboard dashboard to see thumbnails on hover."
echo "   Run this script again anytime to refresh thumbnails."

# ── WATCH MODE ────────────────────────────────────────────────────
if [ "$1" = "--watch" ]; then
  echo ""
  echo "👀 Watch mode: re-screenshotting every 60 seconds..."
  while true; do
    sleep 60
    screenshot_html "$STORYBOARD_DIR/index.html" "storyboard-dashboard"
  done
fi
