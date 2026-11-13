"""Export proposed Earth Fleet hero from a window-only gameplay recording.

Requires ffmpeg and Pillow. Original recording stays in game repository.
Usage: python tools/prepare-hero-media.py [raw-recording.mp4]
"""
import argparse
import io
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "source", nargs="?", type=Path,
    default=ROOT.parent / "xenonrift/Logs/website-media/earth-fleet-raw.mp4",
)
args = parser.parse_args()
source = args.source.expanduser().resolve()
if not source.is_file():
    parser.error(f"Missing source: {source}")

# ScreenCaptureKit recorded only game window at 1600x956, including 56px title bar.
# Keep actual game HUD and development-build label. No AI imagery or speed changes.
crop = "crop=1600:900:0:56"
video = ROOT / "public/videos/earth-fleet-gameplay.mp4"
video.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
    "-ss", "36.5", "-i", str(source), "-t", "10.5",
    "-vf", f"{crop},scale=1280:720:flags=lanczos,fps=30",
    "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "25",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video),
], check=True)
frame = subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error",
    "-ss", "40.5", "-i", str(source), "-vf", crop,
    "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-",
], check=True, stdout=subprocess.PIPE).stdout
with Image.open(io.BytesIO(frame)) as image:
    image = image.convert("RGB")
    for width, suffix in ((1600, ""), (800, "-800")):
        destination = ROOT / f"public/images/gameplay/earth-fleet{suffix}.webp"
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.resize((width, round(width * 9 / 16)), Image.Resampling.LANCZOS).save(
            destination, "WEBP", quality=85, method=6,
        )
        print(f"{destination.relative_to(ROOT)}: {destination.stat().st_size:,} bytes")
print(f"{video.relative_to(ROOT)}: {video.stat().st_size:,} bytes")
