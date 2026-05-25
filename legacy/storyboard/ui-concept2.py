"""
UI concept v2 — cleaner, bigger, more contrast between NOW and PROPOSED
"""
from PIL import Image, ImageDraw, ImageFont
import os

FONTS = "/sessions/wonderful-intelligent-pasteur/mnt/.claude/skills/canvas-design/canvas-fonts"

def font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONTS, name), size)
    except:
        return ImageFont.load_default()

W, H = 2600, 1700
img = Image.new("RGB", (W, H), "#0a0b12")
d = ImageDraw.Draw(img)

# ── type shortcuts ────────────────────────────────────────────
def tw(t, f):
    bb = f.getbbox(t)
    return bb[2] - bb[0]

def rr(x0,y0,x1,y1,r,fill=None,outline=None,lw=1):
    if fill:    d.rounded_rectangle((x0,y0,x1,y1), radius=r, fill=fill)
    if outline: d.rounded_rectangle((x0,y0,x1,y1), radius=r, outline=outline, width=lw)

def dot(x,y,r,col):
    d.ellipse((x-r,y-r,x+r,y+r), fill=col)

def hline(x0,x1,y,col,lw=1):
    d.line((x0,y,x1,y), fill=col, width=lw)

def vline(x,y0,y1,col,lw=1):
    d.line((x,y0,x,y1), fill=col, width=lw)

# ── Fonts ─────────────────────────────────────────────────────
fUI   = lambda s: font("InstrumentSans-Regular.ttf", s)
fUIb  = lambda s: font("InstrumentSans-Bold.ttf",    s)
fMono = lambda s: font("DMMono-Regular.ttf",          s)
fHead = lambda s: font("BricolageGrotesque-Bold.ttf", s)

# ── Colors ────────────────────────────────────────────────────
BG     = "#0a0b12"
SURF   = "#11121d"
SURF2  = "#191a28"
BORD   = "#1c1e2e"
BORD2  = "#262840"
TEXT   = "#e4e6f0"
TEXT2  = "#7a7d98"
TEXT3  = "#383a52"
ACC    = "#6c63ff"
GRN    = "#22c55e"
AMB    = "#f59e0b"
BLU    = "#60a5fa"
PUR    = "#a78bfa"
RED    = "#f87171"

# ── Layout ────────────────────────────────────────────────────
MID   = W // 2
PAD   = 80
TOP   = 160
SBWID = 210   # sidebar width
CGAP  = 24    # gap sidebar → cards


# ═══════════════════════════════════════════════════════════════════════════════
# PANEL TITLES
# ═══════════════════════════════════════════════════════════════════════════════
d.text((PAD, 44), "NOW", font=fHead(64), fill="#2a2c42")
d.text((MID + PAD, 44), "PROPOSED", font=fHead(64), fill=TEXT)
d.text((PAD, 116), "Signal redundancy — the same info, shouted twice", font=fUI(26), fill="#3a3c58")
d.text((MID + PAD, 116), "One signal per idea — less reads faster", font=fUI(26), fill=TEXT2)

vline(MID, 30, H - 30, BORD2, 1)


# ═══════════════════════════════════════════════════════════════════════════════
# LEFT PANEL — "NOW" problems
# ═══════════════════════════════════════════════════════════════════════════════
px, py = PAD, TOP

# ── Sidebar ──────────────────────────────────────────────────
rr(px, py, px+SBWID, py+820, 14, fill=SURF)

SY = py + 20

# Problem 1: ALL-CAPS section header
d.text((px+16, SY), "OVERVIEW", font=fUIb(13), fill=TEXT3)
SY += 22
rr(px+8, SY, px+SBWID-8, SY+34, 8, fill=SURF2)
dot(px+24, SY+17, 5, TEXT2)
d.text((px+36, SY+8), "All work", font=fUIb(20), fill=TEXT)
d.text((px+SBWID-46, SY+9), "140", font=fUI(18), fill=TEXT2)
SY += 46

d.text((px+16, SY+4), "ACTIVE PROJECTS", font=fUIb(13), fill=TEXT3)
SY += 26
for nm, col, age in [("Storyboard","#22c55e","Today"),("Curated Estate","#f59e0b","3d"),("Opero Agency","#6c63ff","6d")]:
    dot(px+22, SY+12, 5, col)
    d.text((px+34, SY+4), nm, font=fUI(19), fill=TEXT2)
    d.text((px+SBWID-50, SY+4), age, font=fUI(17), fill=TEXT3)
    SY += 28

d.text((px+16, SY+8), "CAPTURE", font=fUIb(13), fill=TEXT3)
SY += 28
for icon, nm, cnt, col in [("💡","Ideas","33",AMB),("✓","Decisions","251",GRN)]:
    d.text((px+16, SY+3), icon, font=fUI(18), fill=col)
    d.text((px+34, SY+4), nm, font=fUI(19), fill=TEXT2)
    d.text((px+SBWID-50, SY+4), cnt, font=fUI(17), fill=col)
    SY += 26

d.text((px+16, SY+8), "INTELLIGENCE", font=fUIb(13), fill=TEXT3)
SY += 28
for nm in ["Agents","Context","Categories","Inspect"]:
    d.text((px+16, SY+4), nm, font=fUI(19), fill=TEXT3)
    SY += 26

d.text((px+16, SY+8), "TOOLS", font=fUIb(13), fill=TEXT3)
SY += 28
for nm, cnt in [("Skills","36"),("Files","365")]:
    d.text((px+16, SY+4), nm, font=fUI(19), fill=TEXT3)
    d.text((px+SBWID-50, SY+4), cnt, font=fUI(17), fill=TEXT3)
    SY += 26

# ── Cards (NOW) ───────────────────────────────────────────────
cx = px + SBWID + CGAP
cy = py
CW = MID - PAD - SBWID - CGAP - 60

card_data = [
    (PUR,  "INTENT",   "⬡", "Day 7 intentions — live blocks, auto session...", "Storyboard", "Apr 20"),
    (GRN,  "DECISION", "✓", "Public URL confirmed live...",                    "Storyboard", "Apr 18"),
    (BLU,  "DISCUSSION","💬","Built with Storyboard — the feedback loop...",   "Storyboard", "Apr 18"),
    (AMB,  "IDEA",     "💡","Outbound agent — monitor Costa Blanca listings",  "Storyboard", "Apr 18"),
]

for col, badge, icon, title, proj, date in card_data:
    rr(cx, cy, cx+CW, cy+90, 11, fill=SURF)
    rr(cx, cy, cx+CW, cy+90, 11, outline=BORD, lw=1)
    # stripe
    d.rounded_rectangle((cx,cy,cx+5,cy+90), radius=11, fill=col)
    # ICON (signal 1)
    d.text((cx+18, cy+20), icon, font=fUIb(28), fill=col)
    # BADGE (signal 2 — redundant with icon)
    bw = tw(badge, fUIb(14))
    rr(cx+50, cy+16, cx+56+bw, cy+34, 20, fill=col+"28")
    d.text((cx+56, cy+17), badge, font=fUIb(14), fill=col)
    # title
    d.text((cx+50, cy+40), title, font=fUIb(21), fill=TEXT)
    # project (line 1)
    d.text((cx+50, cy+66), proj, font=fUI(17), fill=col)
    # date (line 2 — separate)
    d.text((cx+50 + tw(proj, fUI(17)) + 14, cy+66), "·  " + date, font=fUI(17), fill=TEXT3)
    cy += 102

# ── Red annotations ───────────────────────────────────────────
ann_x = px + SBWID + 10
ann_right = MID - 20

# Nav: ALL-CAPS
ay_nav = py + 20 + 8
d.line((ann_x, ay_nav, ann_right - 10, ay_nav), fill=RED, width=1)
dot(ann_right, ay_nav, 3, RED)
d.text((ann_right - tw("6 ALL-CAPS section headers", fUI(15)) - 4, ay_nav - 22), "6 ALL-CAPS section headers", font=fUI(15), fill=RED)

# Nav: count of headers
ay_nav2 = py + 20 + 22 + 46 + 3*28 + 26 + 2*26 + 28 + 4*26
d.line((ann_x, ay_nav2, ann_right - 10, ay_nav2), fill=RED, width=1)
dot(ann_right, ay_nav2, 3, RED)
d.text((ann_right - tw("5 labels for 13 nav items", fUI(15)) - 4, ay_nav2 - 20), "5 labels for 13 nav items", font=fUI(15), fill=RED)

# Card: icon + badge
icon_badge_y = py + 22
d.rectangle((cx+14, icon_badge_y, cx+60+tw("INTENT",fUIb(14)), icon_badge_y+24), outline=RED, width=1)
# arrow right
ax_r = cx + 60 + tw("INTENT",fUIb(14)) + 8
d.line((ax_r, icon_badge_y+12, ax_r + 80, icon_badge_y+12), fill=RED, width=1)
d.text((ax_r + 84, icon_badge_y+2), "icon + badge = same signal", font=fUI(15), fill=RED)

# Card: two-line meta
meta_y = py + 66
d.rectangle((cx+48, meta_y, cx+200, meta_y+22), outline=RED, width=1)
d.line((cx+200+2, meta_y+11, cx+CW-20, meta_y+11), fill=RED, width=1)
d.text((cx+CW-20-tw("two metadata lines",fUI(15)), meta_y+1), "two metadata lines", font=fUI(15), fill=RED)


# ═══════════════════════════════════════════════════════════════════════════════
# RIGHT PANEL — PROPOSED
# ═══════════════════════════════════════════════════════════════════════════════
px2 = MID + PAD
py2 = TOP

# ── Sidebar (proposed) ────────────────────────────────────────
rr(px2, py2, px2+SBWID, py2+820, 14, fill=SURF)

SY2 = py2 + 16

# Active item — accent background, no header
rr(px2+8, SY2, px2+SBWID-8, SY2+38, 9, fill=ACC+"1a")
dot(px2+26, SY2+19, 6, ACC)
d.text((px2+40, SY2+10), "All work", font=fUIb(21), fill=TEXT)
d.text((px2+SBWID-50, SY2+11), "140", font=fUI(19), fill=ACC)
SY2 += 52

# Divider (replaces "ACTIVE PROJECTS" label)
hline(px2+16, px2+SBWID-16, SY2, BORD2, 1)
SY2 += 14

for nm, col, age in [("Storyboard",GRN,"Today"),("Curated Estate",AMB,"3d"),("Opero Agency",ACC,"6d")]:
    dot(px2+22, SY2+12, 5, col)
    d.text((px2+36, SY2+3), nm, font=fUI(20), fill=TEXT2)
    d.text((px2+SBWID-54, SY2+3), age, font=fUI(17), fill=TEXT3)
    SY2 += 30

SY2 += 4
hline(px2+16, px2+SBWID-16, SY2, BORD2, 1)
SY2 += 14

for icon, nm, cnt, col in [("💡","Ideas","33",AMB),("✓","Decisions","251",GRN)]:
    d.text((px2+16, SY2+3), icon, font=fUI(20), fill=col)
    d.text((px2+36, SY2+3), nm, font=fUI(20), fill=TEXT2)
    d.text((px2+SBWID-54, SY2+3), cnt, font=fUI(17), fill=col)
    SY2 += 30

SY2 += 4
hline(px2+16, px2+SBWID-16, SY2, BORD2, 1)
SY2 += 14

for nm in ["Context","Categories","Inspect"]:
    d.text((px2+36, SY2+3), nm, font=fUI(20), fill=TEXT3)
    SY2 += 28

SY2 += 4
hline(px2+16, px2+SBWID-16, SY2, BORD2, 1)
SY2 += 14

for nm, cnt in [("Skills","36"),("Files","365")]:
    d.text((px2+36, SY2+3), nm, font=fUI(20), fill=TEXT3)
    d.text((px2+SBWID-54, SY2+3), cnt, font=fUI(17), fill=TEXT3)
    SY2 += 28

# ── Cards (proposed) ─────────────────────────────────────────
cx2 = px2 + SBWID + CGAP
cy2 = py2
CW2 = MID - PAD - SBWID - CGAP - 60

cards_new = [
    (PUR, "Day 7 intentions — live blocks, auto session startup...", "Storyboard · Apr 20"),
    (GRN, "Public URL confirmed live — oskar-del.github.io/storyboard", "Storyboard · Apr 18"),
    (BLU, "Built with Storyboard — the feedback loop ships first",   "Storyboard · Apr 18"),
    (AMB, "Outbound agent — monitor Costa Blanca new listings daily","Storyboard · Apr 18"),
]

for col, title, meta in cards_new:
    rr(cx2, cy2, cx2+CW2, cy2+82, 11, fill=SURF)
    rr(cx2, cy2, cx2+CW2, cy2+82, 11, outline=BORD, lw=1)
    # stripe only
    d.rounded_rectangle((cx2,cy2,cx2+4,cy2+82), radius=11, fill=col)
    # one dot — one signal
    dot(cx2+22, cy2+24, 6, col)
    # title
    d.text((cx2+42, cy2+11), title, font=fUIb(21), fill=TEXT)
    # one metadata line
    d.text((cx2+42, cy2+52), meta, font=fUI(17), fill=TEXT3)
    cy2 += 94

# ── Green annotations ─────────────────────────────────────────
ann_x2 = px2 + SBWID + 10
ann_right2 = MID + PAD + SBWID + CGAP + CW2 + 10

# Nav: divider replaces label
ay_n1 = py2 + 16 + 38 + 12 + 7
d.line((ann_x2, ay_n1, ann_x2 + 100, ay_n1), fill=GRN, width=1)
d.text((ann_x2 + 108, ay_n1-10), "divider does\nthe grouping", font=fUI(15), fill=GRN)

# Nav: active accent bg
ay_n2 = py2 + 16 + 19
d.line((px2+SBWID, ay_n2, px2+SBWID+40, ay_n2), fill=GRN, width=1)
d.text((px2+SBWID+46, ay_n2-10), "accent bg\n= active, no label needed", font=fUI(15), fill=GRN)

# Card: one signal
card_dot_y = py2 + 24
d.line((cx2+30, card_dot_y, cx2+80, card_dot_y), fill=GRN, width=1)
d.text((cx2+84, card_dot_y-10), "dot + stripe\n= one signal, not two", font=fUI(15), fill=GRN)

# Card: one meta line
meta2_y = py2 + 52
d.line((cx2+42, meta2_y+8, cx2+42+180, meta2_y+8), fill=GRN, width=1)
d.text((cx2+42+186, meta2_y-2), "project · date\non one line", font=fUI(15), fill=GRN)


# ═══════════════════════════════════════════════════════════════════════════════
# BOTTOM PRINCIPLES
# ═══════════════════════════════════════════════════════════════════════════════
by = H - 160
hline(PAD, W-PAD, by, BORD2, 1)

rules = [
    ("Remove redundancy",   "Icon + badge = same signal. Drop the badge."),
    ("Space groups items",  "1px line + 12px gap = section. No label needed."),
    ("One metadata line",   "project · date on one row. Scan, don't read."),
    ("Colour does the work","Stripe + dot carry the type. Title carries meaning."),
]

col_w = (W - PAD*2) // 4
for i,(title,body) in enumerate(rules):
    bx = PAD + i * col_w
    d.text((bx, by+26), title, font=fUIb(22), fill=TEXT)
    d.text((bx, by+56), body, font=fUI(19), fill=TEXT3)
    if i > 0:
        vline(bx-24, by+22, by+100, BORD2, 1)


# ── Save ──────────────────────────────────────────────────────
out = "/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/ui-concept2.png"
img.save(out, "PNG")

# Downscale for viewing
img2 = img.resize((1950, 1275), Image.LANCZOS)
img2.save("/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/ui-concept2-view.png", "PNG")
print(f"Done — {W}x{H}")
