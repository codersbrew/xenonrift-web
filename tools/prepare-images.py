"""Create landing-page WebP assets from local game captures (requires Pillow).

Usage: python tools/prepare-images.py [path/to/xenonrift]
Original captures stay in game repository; only optimized exports ship here.
"""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GAME = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else ROOT.parent / "xenonrift"
SOURCE = GAME / "Logs" / "Screenshots"


def export(image, destination, width):
    destination.parent.mkdir(parents=True, exist_ok=True)
    height = round(image.height * width / image.width)
    image.resize((width, height), Image.Resampling.LANCZOS).save(
        destination, "WEBP", quality=85, method=6
    )
    print(f"{destination.relative_to(ROOT)}: {destination.stat().st_size // 1024} KB")


for name, filename in {
    "skirmish": "06_skirmish.png",
    "boost": "04_boost.png",
    "combat": "02_combat.png",
    "galaxy": "galaxy_1_map.png",
}.items():
    with Image.open(SOURCE / filename) as image:
        image = image.convert("RGB")
        export(image, ROOT / f"public/images/gameplay/{name}.webp", image.width)
        export(image, ROOT / f"public/images/gameplay/{name}-800.webp", 800)

for name in ("Interceptor", "Striker", "Dreadnought"):
    with Image.open(SOURCE / f"ship_{name}_perspective.png") as image:
        # Remove rendered labels and excess background; retain entire ship.
        image = image.convert("RGB").crop((430, 200, 1150, 740))
        export(image, ROOT / f"public/images/ships/{name.lower()}.webp", 720)
