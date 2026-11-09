"""Create landing-page WebP assets from local game captures (requires Pillow).

Usage: python tools/prepare-images.py [path/to/xenonrift] [--ships-only | --fleet-only]
Re-render ship captures from current prefabs before exporting (see README).
Original captures stay in game repository; only optimized exports ship here.
"""
import argparse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("game", nargs="?", type=Path, default=ROOT.parent / "xenonrift")
mode = parser.add_mutually_exclusive_group()
mode.add_argument("--ships-only", action="store_true", help="Leave gameplay captures untouched")
mode.add_argument("--fleet-only", action="store_true", help="Export the Fleet Battle capture only")
args = parser.parse_args()
GAME = args.game.expanduser()
SOURCE = GAME / "Logs" / "Screenshots"


def export(image, destination, width):
    destination.parent.mkdir(parents=True, exist_ok=True)
    height = round(image.height * width / image.width)
    image.resize((width, height), Image.Resampling.LANCZOS).save(
        destination, "WEBP", quality=85, method=6
    )
    print(f"{destination.relative_to(ROOT)}: {destination.stat().st_size // 1024} KB")


if args.fleet_only:
    with Image.open(SOURCE / "fleet_2_cyan_fleet.png") as image:
        image = image.convert("RGB")
        export(image, ROOT / "public/images/gameplay/fleet.webp", image.width)
        export(image, ROOT / "public/images/gameplay/fleet-800.webp", 800)

if not args.ships_only and not args.fleet_only:
    for name, filename in {
        "fleet": "fleet_2_cyan_fleet.png",
        "skirmish": "06_skirmish.png",
        "boost": "04_boost.png",
        "combat": "02_combat.png",
        "galaxy": "galaxy_1_map.png",
    }.items():
        with Image.open(SOURCE / filename) as image:
            image = image.convert("RGB")
            export(image, ROOT / f"public/images/gameplay/{name}.webp", image.width)
            export(image, ROOT / f"public/images/gameplay/{name}-800.webp", 800)

if not args.fleet_only:
    for name in ("Interceptor", "Striker", "Dreadnought"):
        with Image.open(SOURCE / f"ship_{name}_perspective.png") as image:
            # Remove rendered labels and excess background; retain entire ship.
            image = image.convert("RGB").crop((430, 200, 1150, 740))
            export(image, ROOT / f"public/images/ships/{name.lower()}.webp", 720)
