#!/usr/bin/env python3
"""Generate placeholder thumbnails for the storyboard until real screenshots are taken"""
from PIL import Image, ImageDraw, ImageFont
import os

THUMBNAILS_DIR = "/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/thumbnails"
os.makedirs(THUMBNAILS_DIR, exist_ok=True)

def make_thumbnail(name, title, bg_color, accent_color, lines=None):
    W, H = 640, 400
    img = Image.new('RGB', (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    # Top accent bar
    draw.rectangle([0, 0, W, 6], fill=accent_color)

    # Simulated UI blocks (representing content)
    # Header area
    draw.rectangle([24, 24, 200, 44], fill=accent_color, outline=None)
    draw.rectangle([210, 30, 360, 40], fill=(*[int(c*0.85) for c in _hex_to_rgb(bg_color)],), outline=None)

    # Content blocks (simulate cards)
    card_colors = [
        _lighten(accent_color, 0.15),
        _lighten(accent_color, 0.12),
        _lighten(accent_color, 0.10),
    ]

    # Three columns of cards
    for col in range(3):
        x = 24 + col * 202
        for row in range(3):
            y = 70 + row * 98
            color = card_colors[row % len(card_colors)]
            draw.rectangle([x, y, x+188, y+84], fill='#ffffff', outline=_hex_to_rgb('#e8e8f0'))
            draw.rectangle([x+8, y+10, x+60, y+22], fill=accent_color)
            draw.rectangle([x+8, y+30, x+170, y+38], fill=_hex_to_rgb('#f0f0f8'))
            draw.rectangle([x+8, y+44, x+130, y+52], fill=_hex_to_rgb('#f0f0f8'))
            draw.rectangle([x+8, y+58, x+100, y+66], fill=_hex_to_rgb('#f0f0f8'))

    # Title text overlay at bottom
    draw.rectangle([0, H-60, W, H], fill=(*_hex_to_rgb('#1a1a2e'), 200))

    # Save
    out_path = os.path.join(THUMBNAILS_DIR, f"{name}-sm.png")
    img = img.resize((320, 200), Image.LANCZOS)
    img.save(out_path, 'PNG')
    print(f"✅ {name}-sm.png")
    return out_path

def _hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def _lighten(hex_color, amount):
    r, g, b = _hex_to_rgb(hex_color)
    return (
        min(255, int(r + (255 - r) * amount)),
        min(255, int(g + (255 - g) * amount)),
        min(255, int(b + (255 - b) * amount)),
    )

# Generate thumbnails for each project / session
thumbnails = [
    ("storyboard-dashboard", "Storyboard Dashboard", "#f4f4f8", "#6c63ff"),
    ("opero-landing",        "Opero Agency Landing", "#f5f3ff", "#6366f1"),
    ("opero-agency-map",     "Opero Agency Map",     "#eef2ff", "#6366f1"),
    ("newbuild-homepage",    "New Build Homepage",    "#f0fdf4", "#10b981"),
    ("foxtons-demo",         "Foxtons Audit Demo",   "#f0f9ff", "#0ea5e9"),
    ("propertyos-map",       "PropertyOS Map",       "#fdf2f8", "#ec4899"),
    ("curated-audit",        "Curated Audit Tool",   "#f0f9ff", "#0ea5e9"),
]

print("🎬 Generating placeholder thumbnails...\n")
for name, title, bg, accent in thumbnails:
    try:
        make_thumbnail(name, title, bg, accent)
    except Exception as e:
        print(f"❌ {name}: {e}")

print(f"\n✅ Done — thumbnails saved to: {THUMBNAILS_DIR}")
print("   Run screenshot.sh to replace with real screenshots.")
