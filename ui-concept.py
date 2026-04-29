"""
UI concept mockup — Storyboard redesign direction
Two panels side by side: NOW vs PROPOSED
"""

from PIL import Image, ImageDraw, ImageFont
import os

FONTS = "/sessions/wonderful-intelligent-pasteur/mnt/.claude/skills/canvas-design/canvas-fonts"

def font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONTS, name), size)
    except:
        return ImageFont.load_default()

# ── Canvas ──────────────────────────────────────────────────────────────────
W, H = 2400, 1500
img = Image.new("RGB", (W, H), "#0b0c14")
d = ImageDraw.Draw(img)

# Fonts
f_label   = font("InstrumentSans-Regular.ttf",  22)
f_label_b = font("InstrumentSans-Bold.ttf",      22)
f_title   = font("InstrumentSans-Bold.ttf",      28)
f_small   = font("InstrumentSans-Regular.ttf",  18)
f_small_b = font("InstrumentSans-Bold.ttf",      18)
f_micro   = font("InstrumentSans-Regular.ttf",  15)
f_tag     = font("InstrumentSans-Bold.ttf",      14)
f_nav     = font("InstrumentSans-Regular.ttf",  20)
f_nav_b   = font("InstrumentSans-Bold.ttf",      20)
f_head    = font("InstrumentSans-Bold.ttf",      13)
f_section = font("InstrumentSans-Bold.ttf",      11)
f_panel   = font("BricolageGrotesque-Bold.ttf",  42)
f_sub     = font("InstrumentSans-Regular.ttf",  24)

# Colors
BG       = "#0b0c14"
SURFACE  = "#12131e"
SURFACE2 = "#181929"
BORDER   = "#1e2030"
BORDER2  = "#252840"
TEXT     = "#e8e9f0"
TEXT2    = "#8b8fa8"
TEXT3    = "#4a4d66"
ACCENT   = "#6c63ff"
GREEN    = "#22c55e"
AMBER    = "#f59e0b"
RED      = "#ef4444"
BLUE     = "#60a5fa"

PANEL_L = 80
PANEL_R = W // 2 + 40
PANEL_W = W // 2 - 120


# ── Helper: rounded rect ────────────────────────────────────────────────────
def rrect(draw, xy, r, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = xy
    if fill:
        draw.rounded_rectangle(xy, radius=r, fill=fill)
    if outline:
        draw.rounded_rectangle(xy, radius=r, outline=outline, width=width)

def text_w(t, f):
    bb = f.getbbox(t)
    return bb[2] - bb[0]

def pill(draw, x, y, text, fg, bg, f=None):
    if f is None: f = f_tag
    tw = text_w(text, f)
    pad = 10
    h = 22
    rrect(draw, (x, y, x + tw + pad*2, y + h), 20, fill=bg)
    draw.text((x + pad, y + 2), text, font=f, fill=fg)
    return tw + pad*2


# ═══════════════════════════════════════════════════════════════
# LEFT PANEL — "NOW" (current UI problems annotated)
# ═══════════════════════════════════════════════════════════════

# Panel label
draw = d
draw.text((PANEL_L, 48), "NOW", font=f_panel, fill=TEXT3)
draw.text((PANEL_L, 100), "Current — signal redundancy", font=f_sub, fill=TEXT3)

px = PANEL_L
py = 160

# ── Sidebar mock ────────────────────────────────────────────────
SB_W = 188
rrect(draw, (px, py, px + SB_W, py + 820), 12, fill=SURFACE)

# Section header — ALL CAPS (the problem)
draw.text((px + 16, py + 18), "OVERVIEW", font=f_head, fill=TEXT3)
sy = py + 38
rrect(draw, (px + 10, sy, px + SB_W - 10, sy + 30), 7, fill=SURFACE2)
draw.text((px + 20, sy + 7), "All work", font=f_nav, fill=TEXT)
draw.text((px + SB_W - 42, sy + 7), "140", font=f_nav, fill=TEXT3)

draw.text((px + 16, sy + 46), "ACTIVE PROJECTS", font=f_head, fill=TEXT3)
projs = [("● Storyboard", GREEN, "Today"), ("● Curated Estate", AMBER, "3d"), ("● Opero Agency", ACCENT, "6d")]
ny = sy + 64
for name, col, age in projs:
    parts = name.split(" ", 1)
    draw.text((px + 20, ny), parts[0], font=f_nav, fill=col)
    draw.text((px + 34, ny), parts[1], font=f_nav, fill=TEXT2)
    draw.text((px + SB_W - 38, ny), age, font=f_micro, fill=TEXT3)
    ny += 28

draw.text((px + 16, ny + 8), "CAPTURE", font=f_head, fill=TEXT3)
ny += 28
for item, count, col in [("💡 Ideas", "33", AMBER), ("✓ Decisions", "251", GREEN)]:
    draw.text((px + 20, ny), item, font=f_nav, fill=TEXT2)
    draw.text((px + SB_W - 38, ny), count, font=f_micro, fill=col)
    ny += 26

draw.text((px + 16, ny + 8), "INTELLIGENCE", font=f_head, fill=TEXT3)
ny += 28
for item in ["🤖 Agents", "◎ Context", "⊞ Categories", "⚡ Inspect"]:
    draw.text((px + 20, ny), item, font=f_nav, fill=TEXT2)
    ny += 26

draw.text((px + 16, ny + 8), "TOOLS", font=f_head, fill=TEXT3)
ny += 28
for item, count in [("✦ Skills", "36"), ("📁 Files", "365")]:
    draw.text((px + 20, ny), item, font=f_nav, fill=TEXT2)
    draw.text((px + SB_W - 44, ny), count, font=f_micro, fill=TEXT3)
    ny += 26

# ── Block cards (current — redundant) ──────────────────────────
cx = px + SB_W + 20
cy = py
CARD_W = PANEL_W - SB_W - 30

cards_now = [
    ("INTENT", "#8b5cf6", "⬡", "Day 7 intentions — live blo...", "Storyboard", "Apr 20"),
    ("DECISION", GREEN,   "✓", "Public URL confirmed live...",   "Storyboard", "Apr 18"),
    ("DISCUSSION", BLUE,  "💬","Built with Storyboard — th...",  "Storyboard", "Apr 18"),
    ("IDEA", AMBER,       "💡","Outbound agent — monitor...",    "Storyboard", "Apr 18"),
]

for type_label, col, icon, title, proj, date in cards_now:
    rrect(draw, (cx, cy, cx + CARD_W, cy + 84), 10, fill=SURFACE)
    rrect(draw, (cx, cy, cx + CARD_W, cy + 84), 10, outline=BORDER, width=1)
    # Left color stripe
    draw.rounded_rectangle((cx, cy, cx + 4, cy + 84), radius=10, fill=col)
    # Icon — big, dominant
    draw.text((cx + 16, cy + 22), icon, font=font("InstrumentSans-Bold.ttf", 26), fill=col)
    # Type badge (the redundant bit) — colored capsule
    tw = text_w(type_label, f_tag)
    rrect(draw, (cx + 44, cy + 16, cx + 44 + tw + 16, cy + 32), 10, fill=col + "22")
    draw.text((cx + 52, cy + 17), type_label, font=f_tag, fill=col)
    # Title
    draw.text((cx + 44, cy + 38), title, font=f_small_b, fill=TEXT)
    # Project + date (two separate lines — the visual noise)
    draw.text((cx + 44, cy + 60), proj, font=f_micro, fill=col)
    draw.text((cx + 44 + text_w(proj, f_micro) + 14, cy + 60), "·", font=f_micro, fill=TEXT3)
    draw.text((cx + 44 + text_w(proj, f_micro) + 22, cy + 60), date, font=f_micro, fill=TEXT3)
    cy += 96

# ── Annotation arrows (problems) ───────────────────────────────
ann_x = px + 16
ann_y = py + 18

# Annotate: ALL-CAPS headers
ax = PANEL_L + SB_W - 10
ay_1 = py + 18
draw.line((ax + 8, ay_1 + 6, ax + 60, ay_1 + 6), fill=RED, width=1)
draw.ellipse((ax + 56, ay_1 + 2, ax + 64, ay_1 + 10), outline=RED, width=1)
draw.text((ax + 68, ay_1 - 2), "ALL-CAPS section headers", font=f_micro, fill=RED)

ay_2 = py + 38 + 46 + 64 + 84 + 50  # near CAPTURE
draw.line((ax + 8, ay_2 + 6, ax + 60, ay_2 + 6), fill=RED, width=1)
draw.text((ax + 68, ay_2 - 2), "5 section labels for 12 items", font=f_micro, fill=RED)

# Annotate: icon + badge redundancy on card
card_ann_x = cx + 44 + 10
card_ann_y = py + 16
# Bracket around icon + badge
draw.rectangle((cx + 14, py + 14, cx + 44 + 90, py + 44), outline=RED, width=1)
draw.line((cx + 44 + 90, py + 28, cx + CARD_W - 20, py + 28), fill=RED, width=1)
draw.text((cx + CARD_W - 200, py + 18), "icon + badge = same thing", font=f_micro, fill=RED)

# Also bracket proj/date separation
draw.rectangle((cx + 42, py + 95 + 56, cx + 42 + 180, py + 95 + 74), outline=RED, width=1)
draw.line((cx + 42 + 180, py + 95 + 65, cx + CARD_W - 20, py + 95 + 65), fill=RED, width=1)
draw.text((cx + CARD_W - 220, py + 95 + 55), "project + date = two lines", font=f_micro, fill=RED)


# ═══════════════════════════════════════════════════════════════
# RIGHT PANEL — "PROPOSED"
# ═══════════════════════════════════════════════════════════════

draw.text((PANEL_R, 48), "PROPOSED", font=f_panel, fill=TEXT)
draw.text((PANEL_R, 100), "Reduced — one signal per idea", font=f_sub, fill=TEXT2)

px2 = PANEL_R
py2 = 160
SB_W2 = 188

# ── Sidebar — no section headers ───────────────────────────────
rrect(draw, (px2, py2, px2 + SB_W2, py2 + 820), 12, fill=SURFACE)

# No headers — just spacing/dividers doing the grouping
sy2 = py2 + 16
rrect(draw, (px2 + 10, sy2, px2 + SB_W2 - 10, sy2 + 32), 8, fill=ACCENT + "18")
# dot accent on active item
draw.ellipse((px2 + 18, sy2 + 11, px2 + 26, sy2 + 19), fill=ACCENT)
draw.text((px2 + 34, sy2 + 8), "All work", font=f_nav_b, fill=TEXT)
draw.text((px2 + SB_W2 - 42, sy2 + 8), "140", font=f_nav, fill=TEXT2)

# Subtle divider (no label)
sy2 += 46
draw.line((px2 + 16, sy2, px2 + SB_W2 - 16, sy2), fill=BORDER2, width=1)
sy2 += 12

projs2 = [("Storyboard", GREEN, "Today"), ("Curated Estate", AMBER, "3d"), ("Opero Agency", ACCENT, "6d")]
for name, col, age in projs2:
    draw.ellipse((px2 + 18, sy2 + 8, px2 + 26, sy2 + 16), fill=col)
    draw.text((px2 + 34, sy2 + 4), name, font=f_nav, fill=TEXT2)
    draw.text((px2 + SB_W2 - 42, sy2 + 4), age, font=f_micro, fill=TEXT3)
    sy2 += 28

# Subtle divider
sy2 += 6
draw.line((px2 + 16, sy2, px2 + SB_W2 - 16, sy2), fill=BORDER2, width=1)
sy2 += 12

# Capture items — no header
for icon, label, count, col in [("💡", "Ideas", "33", AMBER), ("✓", "Decisions", "251", GREEN)]:
    draw.text((px2 + 18, sy2 + 4), icon, font=f_nav, fill=col)
    draw.text((px2 + 36, sy2 + 4), label, font=f_nav, fill=TEXT2)
    draw.text((px2 + SB_W2 - 42, sy2 + 4), count, font=f_micro, fill=col)
    sy2 += 28

sy2 += 6
draw.line((px2 + 16, sy2, px2 + SB_W2 - 16, sy2), fill=BORDER2, width=1)
sy2 += 12

# Intelligence — no header
for icon, label in [("◎", "Context"), ("⊞", "Categories"), ("⚡", "Inspect")]:
    draw.text((px2 + 18, sy2 + 4), icon, font=f_nav, fill=TEXT3)
    draw.text((px2 + 36, sy2 + 4), label, font=f_nav, fill=TEXT3)
    sy2 += 28

sy2 += 6
draw.line((px2 + 16, sy2, px2 + SB_W2 - 16, sy2), fill=BORDER2, width=1)
sy2 += 12

for icon, label, count in [("✦", "Skills", "36"), ("📁", "Files", "365")]:
    draw.text((px2 + 18, sy2 + 4), icon, font=f_nav, fill=TEXT3)
    draw.text((px2 + 36, sy2 + 4), label, font=f_nav, fill=TEXT3)
    draw.text((px2 + SB_W2 - 46, sy2 + 4), count, font=f_micro, fill=TEXT3)
    sy2 += 28

# ── Block cards — clean ─────────────────────────────────────────
cx2 = px2 + SB_W2 + 20
cy2 = py2
CARD_W2 = PANEL_W - SB_W2 - 30

cards_new = [
    ("#8b5cf6", "Day 7 intentions — live blocks, auto session startup...", "Storyboard · Apr 20"),
    (GREEN,     "Public URL confirmed live — oskar-del.github.io/storyboard", "Storyboard · Apr 18"),
    (BLUE,      "Built with Storyboard — the feedback loop ships first",       "Storyboard · Apr 18"),
    (AMBER,     "Outbound agent — monitor Costa Blanca new listings daily",    "Storyboard · Apr 18"),
]

for col, title, meta in cards_new:
    rrect(draw, (cx2, cy2, cx2 + CARD_W2, cy2 + 72), 10, fill=SURFACE)
    rrect(draw, (cx2, cy2, cx2 + CARD_W2, cy2 + 72), 10, outline=BORDER, width=1)
    # Thin left stripe only — one signal for type
    draw.rounded_rectangle((cx2, cy2, cx2 + 3, cy2 + 72), radius=10, fill=col)
    # Color dot (replaces icon + badge) — minimal
    draw.ellipse((cx2 + 14, cy2 + 16, cx2 + 24, cy2 + 26), fill=col)
    # Title — prominent
    draw.text((cx2 + 36, cy2 + 12), title, font=f_small_b, fill=TEXT)
    # Meta — one line, subdued
    draw.text((cx2 + 36, cy2 + 46), meta, font=f_micro, fill=TEXT3)
    cy2 += 84

# ── Annotation (positives) ──────────────────────────────────────
ax2 = px2 + SB_W2 - 10
ay2_1 = py2 + 18 + 46 + 12  # near first divider

draw.line((ax2 + 8, ay2_1, ax2 + 60, ay2_1), fill=GREEN, width=1)
draw.text((ax2 + 68, ay2_1 - 8), "spacing does grouping — no labels", font=f_micro, fill=GREEN)

ay2_2 = py2 + 16 + 11  # active item row
draw.line((ax2 + 8, ay2_2 + 4, ax2 + 60, ay2_2 + 4), fill=GREEN, width=1)
draw.text((ax2 + 68, ay2_2 - 4), "active row = accent bg, no header needed", font=f_micro, fill=GREEN)

# Dot on card
card_ann2_y = py2 + 18
draw.line((cx2 + 24, card_ann2_y, cx2 + CARD_W2 - 20, card_ann2_y), fill=GREEN, width=1)
draw.text((cx2 + CARD_W2 - 260, card_ann2_y - 12), "one dot, one stripe = enough", font=f_micro, fill=GREEN)

meta_ann_y = py2 + 12 + 46
draw.line((cx2 + 36, meta_ann_y + 84 + 8, cx2 + CARD_W2 - 20, meta_ann_y + 84 + 8), fill=GREEN, width=1)
draw.text((cx2 + CARD_W2 - 260, meta_ann_y + 84 - 4), "project · date on one line", font=f_micro, fill=GREEN)


# ═══════════════════════════════════════════════════════════════
# Divider between panels
# ═══════════════════════════════════════════════════════════════
mid_x = W // 2
draw.line((mid_x, 40, mid_x, H - 40), fill=BORDER2, width=1)


# ═══════════════════════════════════════════════════════════════
# Bottom — principle summary
# ═══════════════════════════════════════════════════════════════
bx = 80
by = H - 140
draw.line((bx, by, W - bx, by), fill=BORDER2, width=1)

principles = [
    ("Remove redundancy", "Icon + badge + stripe = 3 signals for 1 idea. Pick one."),
    ("Let space group", "ALL-CAPS headers shout. A 1px line + 12px gap whispers the same thing."),
    ("One metadata line", "Project · date on one row. Not stacked — scanned."),
    ("Colour does the typing", "The stripe and dot carry type. The title carries meaning."),
]

px_p = bx
for title, body in principles:
    draw.text((px_p, by + 20), title, font=f_small_b, fill=TEXT)
    draw.text((px_p, by + 44), body, font=f_micro, fill=TEXT3)
    px_p += (W - bx*2) // 4


# ── Save ────────────────────────────────────────────────────────
out = "/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/ui-concept.png"
img.save(out, "PNG", dpi=(144, 144))
print(f"Saved: {out}")
print(f"Size: {W}x{H}")
