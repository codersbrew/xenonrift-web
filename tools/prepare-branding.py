"""Extract original game lettering, never redraw it with a substitute font.

Requires Pillow. Usage: python tools/prepare-branding.py [path/to/xenonrift]
The game ships a flattened key-art image, not a transparent logo. These masks
isolate its lettering while preserving original bevels, colors, and neon edges.
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
GAME = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else ROOT.parent / "xenonrift"
SOURCE = GAME / "Assets/XenonRift/Art/UI/XenonRift_KeyArt.png"
DESTINATION = ROOT / "public/images/brand"
DESTINATION.mkdir(parents=True, exist_ok=True)

with Image.open(SOURCE) as source:
    art = source.convert("RGBA")
if art.size != (1376, 768):
    raise ValueError("Key art changed dimensions; review lettering mask before regenerating.")

mask = Image.new("L", art.size)
draw = ImageDraw.Draw(mask)
# Glyph silhouettes in source coordinates. Only alpha is altered; RGB comes
# directly from in-game art. O and R counters remain transparent.
draw.polygon([(294,170),(314,170),(338,194),(360,170),(382,170),(349,211),(384,251),(361,251),(338,227),(315,251),(294,251),(327,211)], fill=255)
draw.polygon([(395,170),(470,170),(470,186),(414,186),(414,200),(459,200),(459,217),(414,217),(414,235),(470,235),(470,251),(395,251)], fill=255)
draw.polygon([(482,170),(502,170),(546,223),(546,170),(565,170),(565,251),(546,251),(502,197),(502,251),(482,251)], fill=255)
draw.rounded_rectangle((578,170,661,253), radius=18, fill=255)
draw.polygon([(676,170),(696,170),(740,223),(740,170),(759,170),(759,251),(740,251),(696,197),(696,251),(676,251)], fill=255)
draw.polygon([(809,170),(872,170),(885,176),(891,187),(891,209),(882,222),(867,223),(892,251),(868,251),(843,225),(830,225),(830,251),(809,251)], fill=255)
draw.rectangle((904,170,923,251), fill=255)
draw.polygon([(936,170),(1009,170),(1009,186),(956,186),(956,200),(998,200),(998,216),(956,216),(956,251),(936,251)], fill=255)
draw.polygon([(1020,170),(1095,170),(1095,186),(1068,186),(1068,251),(1049,251),(1049,186),(1020,186)], fill=255)
# Retain original circular rift and horizontal rails above/below lettering.
# Restrict ring matte to exposed arcs; its center is covered by the wordmark.
ring = Image.new("L", art.size)
ring_draw = ImageDraw.Draw(ring)
for radius, width in ((116, 7), (90, 5)):
    ring_draw.ellipse((687-radius,210-radius,687+radius,210+radius), outline=255, width=width)
exposed = Image.new("L", art.size)
exposed_draw = ImageDraw.Draw(exposed)
exposed_draw.rectangle((550,80,825,157), fill=255)
exposed_draw.rectangle((550,265,825,340), fill=255)
ring = ImageChops.multiply(ring, exposed)
rail_draw = ImageDraw.Draw(ring)
for start, end, y in ((296,620,154), (754,1095,154), (296,625,269), (752,1095,269)):
    rail_draw.line((start,y,end,y), fill=255, width=4)
mask = ImageChops.lighter(mask, ring)
# Small dilation covers antialiased bevel edges; low-opacity halo keeps glow.
core = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.45))
halo = mask.filter(ImageFilter.GaussianBlur(5)).point(lambda value: round(value * .45))
alpha = ImageChops.lighter(core, halo)
counters = Image.new("L", art.size)
counter_draw = ImageDraw.Draw(counters)
counter_draw.rounded_rectangle((602,187,639,234), radius=4, fill=255)
counter_draw.rounded_rectangle((831,185,869,208), radius=2, fill=255)
alpha = ImageChops.subtract(alpha, counters.filter(ImageFilter.GaussianBlur(.6)))
art.putalpha(alpha)

wordmark = art.crop((280,80,1110,340))
wordmark.save(DESTINATION / "wordmark.webp", "WEBP", lossless=True, method=6)
# Browser/app icon uses exact first letter, not a different orbital emblem.
monogram = art.crop((282,158,396,266))
icon = Image.new("RGBA", (128,128), (7,10,16,255))
monogram.thumbnail((112,112), Image.Resampling.LANCZOS)
icon.alpha_composite(monogram, ((128-monogram.width)//2, (128-monogram.height)//2))
icon.save(ROOT / "public/favicon.png")
icon.resize((180,180), Image.Resampling.LANCZOS).save(ROOT / "public/apple-touch-icon.png")
for path in (DESTINATION / "wordmark.webp", ROOT / "public/favicon.png"):
    print(f"{path.relative_to(ROOT)}: {path.stat().st_size // 1024} KB")
