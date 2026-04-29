"""
Storyboard UI redesign mockup — clean, no annotations.
Looks like an actual screenshot of the proposed design.
"""
from PIL import Image, ImageDraw, ImageFont
import os

FONTS = "/sessions/wonderful-intelligent-pasteur/mnt/.claude/skills/canvas-design/canvas-fonts"

def font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONTS, name), size)
    except:
        return ImageFont.load_default()

W, H = 2400, 1560
img = Image.new("RGB", (W, H), "#0b0c15")
d = ImageDraw.Draw(img)

def tw(t, f):
    bb = f.getbbox(t)
    return bb[2] - bb[0]

def rr(x0,y0,x1,y1,r,fill=None,outline=None,lw=1):
    if fill:    d.rounded_rectangle((x0,y0,x1,y1), radius=r, fill=fill)
    if outline: d.rounded_rectangle((x0,y0,x1,y1), radius=r, outline=outline, width=lw)

def dot(x,y,r,col):
    d.ellipse((x-r,y-r,x+r,y+r), fill=col)

def hline(x0,x1,y,col="#1e2030",lw=1):
    d.line((x0,y,x1,y), fill=col, width=lw)

# Colors
BG    = "#0b0c15"
SURF  = "#10111c"
SURF2 = "#161724"
SURF3 = "#1c1d2c"
BORD  = "#1e2032"
BORD2 = "#262840"
TEXT  = "#e2e4ef"
TEXT2 = "#6e7191"
TEXT3 = "#383a52"
ACC   = "#6c63ff"
GRN   = "#22c55e"
AMB   = "#f59e0b"
BLU   = "#60a5fa"
PUR   = "#a78bfa"
RED   = "#f87171"
TEAL  = "#2dd4bf"

# Fonts
fNav   = font("InstrumentSans-Regular.ttf", 22)
fNavB  = font("InstrumentSans-Bold.ttf",    22)
fSm    = font("InstrumentSans-Regular.ttf", 18)
fSmB   = font("InstrumentSans-Bold.ttf",    19)
fMicro = font("InstrumentSans-Regular.ttf", 16)
fMcB   = font("InstrumentSans-Bold.ttf",    16)
fTitle = font("InstrumentSans-Bold.ttf",    24)
fTitleL= font("BricolageGrotesque-Bold.ttf",28)
fMono  = font("DMMono-Regular.ttf",         16)
fTag   = font("InstrumentSans-Bold.ttf",    13)
fTagR  = font("InstrumentSans-Regular.ttf", 13)

# ═══════════════════════════════════════════════════════════
# TOPBAR
# ═══════════════════════════════════════════════════════════
TOPBAR_H = 52
rr(0, 0, W, TOPBAR_H, 0, fill=SURF)
hline(0, W, TOPBAR_H, BORD)

# Logo
d.text((22, 12), "⬡", font=font("InstrumentSans-Bold.ttf", 28), fill=ACC)
d.text((52, 14), "Storyboard", font=font("InstrumentSans-Bold.ttf", 24), fill=TEXT)

# Topbar right actions
tbr = W - 24
# Day pill
pill_txt = "Day 7 / 10"
ptw = tw(pill_txt, fSmB)
rr(tbr-ptw-28, 12, tbr, TOPBAR_H-12, 20, fill=ACC+"18")
d.text((tbr-ptw-14, 14), pill_txt, font=fSmB, fill=ACC)
tbr -= ptw + 44

# Carry forward btn
cf_txt = "+ Carry forward"
ctw_val = tw(cf_txt, fSmB)
rr(tbr-ctw_val-28, 11, tbr, TOPBAR_H-11, 20, fill=ACC)
d.text((tbr-ctw_val-14, 14), cf_txt, font=fSmB, fill="#fff")
tbr -= ctw_val + 50

# Search btn
rr(tbr-36, 11, tbr, TOPBAR_H-11, 20, fill=SURF3)
d.text((tbr-28, 13), "⌘K", font=fMicro, fill=TEXT3)
tbr -= 54

# Mode
for label, active in [("Light", False), ("Dark", True)]:
    ltw = tw(label, fSm)
    bg = SURF3 if active else "transparent"
    tc = TEXT if active else TEXT3
    if active:
        rr(tbr-ltw-20, 12, tbr, TOPBAR_H-12, 16, fill=SURF3)
    d.text((tbr-ltw-10, 14), label, font=fSm, fill=tc)
    tbr -= ltw + 28

# ═══════════════════════════════════════════════════════════
# LEFT SIDEBAR
# ═══════════════════════════════════════════════════════════
SB = 220
rr(0, TOPBAR_H, SB, H, 0, fill=SURF)
d.line((SB, TOPBAR_H, SB, H), fill=BORD, width=1)

sy = TOPBAR_H + 20

# All work — active, accent highlight
rr(10, sy, SB-10, sy+40, 10, fill=ACC+"1c")
dot(28, sy+20, 6, ACC)
d.text((42, sy+10), "All work", font=fNavB, fill=TEXT)
cnt_txt = "140"
d.text((SB-14-tw(cnt_txt,fSm), sy+11), cnt_txt, font=fSm, fill=ACC)
sy += 52

# Divider — replaces "ACTIVE PROJECTS"
hline(18, SB-18, sy, BORD2)
sy += 16

# Projects
for name, col, age in [
    ("Storyboard",    GRN, "Today"),
    ("Curated Estate",AMB, "3d"),
    ("Opero Agency",  ACC, "6d"),
    ("+ 6 more",     TEXT3, ""),
]:
    if name == "+ 6 more":
        d.text((42, sy+4), name, font=fSm, fill=TEXT3)
        sy += 26
        continue
    dot(26, sy+13, 5, col)
    d.text((40, sy+4), name, font=fNav, fill=TEXT2)
    if age:
        d.text((SB-12-tw(age,fMicro), sy+5), age, font=fMicro, fill=TEXT3)
    sy += 28

sy += 6
hline(18, SB-18, sy, BORD2)
sy += 16

# Capture items
for icon, label, count, col in [
    ("💡", "Ideas",     "33",  AMB),
    ("✓",  "Decisions", "251", GRN),
]:
    d.text((16, sy+3), icon, font=fNav, fill=col)
    d.text((40, sy+4), label, font=fNav, fill=TEXT2)
    d.text((SB-14-tw(count,fSm), sy+5), count, font=fSm, fill=col)
    sy += 28

sy += 6
hline(18, SB-18, sy, BORD2)
sy += 16

# Intelligence
for label in ["Agents", "Context", "Categories", "Inspect"]:
    d.text((40, sy+4), label, font=fNav, fill=TEXT3)
    sy += 27

sy += 4
hline(18, SB-18, sy, BORD2)
sy += 14

# Tools
for label, count in [("Skills","36"),("Files","365")]:
    d.text((40, sy+4), label, font=fNav, fill=TEXT3)
    d.text((SB-14-tw(count,fMicro), sy+5), count, font=fMicro, fill=TEXT3)
    sy += 27

# AI usage bar at bottom
sy_usage = H - 130
hline(18, SB-18, sy_usage, BORD2)
d.text((18, sy_usage+14), "AI Sessions · Apr", font=fMicro, fill=TEXT3)
d.text((SB-18-tw("Console ↗",fMicro), sy_usage+14), "Console ↗", font=fMicro, fill=ACC)
rr(18, sy_usage+36, SB-18, sy_usage+48, 6, fill=SURF3)
rr(18, sy_usage+36, 18+(SB-36)*72//100, sy_usage+48, 6, fill=ACC+"88")
d.text((18, sy_usage+58), "45 sessions  ↑ 39 vs last month", font=fMicro, fill=TEXT3)

# Avatar
rr(14, H-64, SB-14, H-16, 10, fill=SURF2)
dot(36, H-40, 13, ACC+"44")
d.text((29, H-50), "O", font=fNavB, fill=ACC)
d.text((56, H-52), "Oskar Hansson", font=fNavB, fill=TEXT2)
d.text((56, H-32), "Sprint · Day 7/10", font=fMicro, fill=TEXT3)

# ═══════════════════════════════════════════════════════════
# MAIN CONTENT
# ═══════════════════════════════════════════════════════════
MX = SB + 24
MW = W - MX - 24

# ── Toolbar ─────────────────────────────────────────────────
TB_Y = TOPBAR_H + 12
for i,(label,active) in enumerate([("All time",True),("This month",False),("This week",False),("Today",False)]):
    ltw2 = tw(label, fSm if not active else fSmB)
    bx2 = MX + i*130
    if active:
        rr(bx2, TB_Y, bx2+ltw2+24, TB_Y+34, 20, fill=ACC+"1a")
        d.text((bx2+12, TB_Y+7), label, font=fSmB, fill=ACC)
    else:
        d.text((bx2+12, TB_Y+7), label, font=fSm, fill=TEXT3)

# View icons (right of toolbar)
vx = MX + MW - 8
for icon in ["⊞","⊟","≡","⋮⋮","—"]:
    d.text((vx-22, TB_Y+7), icon, font=fSm, fill=TEXT3)
    vx -= 32

hline(MX, W-24, TOPBAR_H+50, BORD)

# ═══════════════════════════════════════════════════════════
# OVERVIEW STRIP
# ═══════════════════════════════════════════════════════════
OY = TOPBAR_H + 64
OW = MW
OH = 110

# Today card
rr(MX, OY, MX+260, OY+OH, 12, fill=SURF2)
d.text((MX+20, OY+14), "TODAY", font=fTag, fill=TEXT3)
d.text((MX+20, OY+32), "5", font=font("BricolageGrotesque-Bold.ttf",52), fill=TEXT)
d.text((MX+20, OY+88), "26 decisions  ·  0 ideas", font=fMicro, fill=TEXT3)

# Velocity card
rr(MX+272, OY, MX+272+220, OY+OH, 12, fill=SURF2)
d.text((MX+292, OY+14), "VELOCITY", font=fTag, fill=TEXT3)
d.text((MX+292, OY+34), "↑ 224%", font=font("InstrumentSans-Bold.ttf",32), fill=GRN)
d.text((MX+292, OY+72), "vs last week", font=fMicro, fill=TEXT3)
# mini sparkline
sx_start = MX + 292
sy_spark = OY + 88
bars = [12, 8, 18, 6, 24, 14, 32]
bw2 = 20
for i, bh in enumerate(bars):
    col2 = ACC if i == 6 else ACC+"55"
    d.rectangle((sx_start+i*bw2+i*3, sy_spark-bh, sx_start+i*bw2+bw2+i*3, sy_spark), fill=col2)

# Sprint card
rr(MX+504, OY, MX+504+260, OY+OH, 12, fill=SURF2)
d.text((MX+524, OY+14), "SPRINT SCORE", font=fTag, fill=TEXT3)
score_txt = "99"
d.text((MX+524, OY+32), score_txt, font=font("BricolageGrotesque-Bold.ttf",52), fill=ACC)
d.text((MX+524, OY+88), "Day 7 / 10  ·  on track", font=fMicro, fill=TEXT3)

# ═══════════════════════════════════════════════════════════
# BLOCK GRID
# ═══════════════════════════════════════════════════════════
GY = OY + OH + 24
CARD_W = (MW - 48) // 3
CARD_H = 110
GCOLS  = 3
GPAD   = 16

blocks = [
    # (color, type_label, title, project, date, tags)
    (PUR,  "intent",    "Day 7 intentions — live blocks,\nauto session startup, categories",  "Storyboard",    "Apr 20", ["live-blocks","auto-startup"]),
    (GRN,  "decision",  "Public URL confirmed live\noskar-del.github.io/storyboard",          "Storyboard",    "Apr 18", ["github","pages"]),
    (BLU,  "discussion","Built with Storyboard — the\nfeedback loop ships first",             "Storyboard",    "Apr 18", ["product","strategy"]),
    (AMB,  "idea",      "Outbound agent — monitor\nCosta Blanca listings daily",              "Storyboard",    "Apr 18", ["automation"]),
    (GRN,  "decision",  "MCP-first: browser extension\nis a bridge, not the plan",            "Storyboard",    "Apr 18", ["mcp","architecture"]),
    (TEAL, "session",   "Airtable Lead Schema + Landing\nMVP — Task 1+2 done",               "PropertyOS",    "Apr 5",  ["airtable","leads"]),
    (RED,  "rejection", "No public content until\nproduct is ready — decided",               "Opero Agency",  "Apr 18", ["strategy"]),
    (BLU,  "discussion","Go-to-market — the full la…",                                       "Storyboard",    "Apr 18", ["gtm"]),
    (AMB,  "idea",      "Facebook automation — 88\ngroups sharing pipeline",                 "New Build Homes","Apr 18", ["social","automation"]),
]

for i, (col, typelabel, title, proj, date, tags) in enumerate(blocks):
    row   = i // GCOLS
    col_i = i % GCOLS
    cx3 = MX + col_i * (CARD_W + GPAD)
    cy3 = GY + row * (CARD_H + GPAD)

    rr(cx3, cy3, cx3+CARD_W, cy3+CARD_H, 11, fill=SURF)
    rr(cx3, cy3, cx3+CARD_W, cy3+CARD_H, 11, outline=BORD, lw=1)

    # Left colour stripe — only signal for type
    d.rounded_rectangle((cx3, cy3, cx3+4, cy3+CARD_H), radius=11, fill=col)

    # Dot (replaces icon + badge)
    dot(cx3+20, cy3+22, 5, col)

    # Title — dominant
    lines = title.split("\n")
    ty = cy3 + 12
    for line in lines:
        d.text((cx3+34, ty), line, font=fSmB, fill=TEXT)
        ty += 24

    # One metadata line: project · date · tags
    proj_col = {
        "Storyboard": ACC, "PropertyOS": TEAL,
        "Opero Agency": PUR, "New Build Homes": AMB,
    }.get(proj, TEXT3)
    meta_y = cy3 + CARD_H - 26
    mx3 = cx3 + 34
    d.text((mx3, meta_y), proj, font=fMcB, fill=proj_col)
    mx3 += tw(proj, fMcB) + 10
    d.text((mx3, meta_y), "·", font=fMicro, fill=TEXT3)
    mx3 += 12
    d.text((mx3, meta_y), date, font=fMicro, fill=TEXT3)
    # tags
    for tag in tags[:2]:
        mx3 += tw(date if tag==tags[0] else tags[0], fMicro) + 14
        rr(mx3, meta_y-1, mx3+tw(tag,fTag)+14, meta_y+17, 20, fill=SURF3)
        d.text((mx3+7, meta_y+1), tag, font=fTag, fill=TEXT3)
        mx3 += tw(tag,fTag)+14

# ── Section label above grid ──────────────────────────────
d.text((MX, GY-20), "LATEST", font=fTag, fill=TEXT3)

# ── Counts bar ───────────────────────────────────────────────
COUNT_Y = OY + OH + 2
hline(MX, MX+MW, COUNT_Y, BORD)
stats = [("107 blocks",""), ("251 decisions",""), ("33 ideas",""), ("9 projects",""), ("6 today","")]
cx4 = MX
for stat, _ in stats:
    parts = stat.split(" ")
    d.text((cx4, COUNT_Y+8), parts[0], font=fNavB, fill=TEXT)
    d.text((cx4+tw(parts[0],fNavB)+6, COUNT_Y+9), parts[1], font=fNav, fill=TEXT3)
    cx4 += 190
hline(MX, MX+MW, COUNT_Y+36, BORD)


# ═══════════════════════════════════════════════════════════
# Subtle label at very bottom
# ═══════════════════════════════════════════════════════════
label = "Storyboard — UI direction concept  ·  Day 7 of 10"
d.text(((W-tw(label,fMicro))//2, H-22), label, font=fMicro, fill=TEXT3)


# ── Save ────────────────────────────────────────────────────
out_full = "/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/ui-mockup.png"
img.save(out_full, "PNG")

img2 = img.resize((1920, 1248), Image.LANCZOS)
img2.save("/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/ui-mockup-view.png", "PNG")
print(f"Done  {W}×{H}")
