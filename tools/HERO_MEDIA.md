# Homepage gameplay media

Homepage now uses Earth Fleet video with responsive still fallback. Run `npm run dev`, open `/`.
Original comparison remains at `/tools/hero-preview.html` (development-only, not a build entry).

## Integration

Earth Fleet gameplay video with matching still fallback. Shows actual fighter combat,
capital-ship scale and current cyan/magenta factions; existing gate shot reads as scenery.
Retain gate shot for lore/environment content.

- `public/videos/earth-fleet-gameplay.mp4`: 10.5 s, 1280×720, 30 fps, H.264,
  silent, fast-start, approximately 3.4 MB. Visible cut at repeat, not a seamless loop.
- `public/images/gameplay/earth-fleet.webp`: 1600×900 still.
- `public/images/gameplay/earth-fleet-800.webp`: 800×450 responsive still.

`src/hero-video.js` shows still immediately and attaches video source only on playback. Muted inline
video loops while visible, with accessible play/pause control. Reduced motion, Save-Data and 2G
connections default to still; explicit play remains available. Hidden tabs/off-screen hero pause video;
manual pause survives scrolling. Playback errors retain still and enlargement link; blocked autoplay
allows manual retry. No-JavaScript users get still without video download. Social metadata uses still.
Development-capture caption identifies offline bots. Video is silent, so no dialogue requires captions.

## Provenance / reproduction

Captured 2026-11-13 from existing local macOS development player, **offline bot gameplay**,
not a human/networked playtest. No game source changes, generated art, fabricated combat,
or simulation speed changes. Game HUD and development-build mark retained.

Player: `~/projects/xenonrift/Builds/macOS/XenonRift.app/Contents/MacOS/Xenon Rift`
Executable SHA-256: `95768f34be375b07f38bafeee75f3dfaf58214edd6865066d77afd3100369542`.
This identifies executable, not complete app bundle or guaranteed source revision.

Launch flags:
```sh
-practice -mode fleet -autopilot -teamsize 12 -zone earth -ship striker -name Pilot \
-screen-fullscreen 0 -screen-width 1600 -screen-height 900
```

Recorded only game window with macOS ScreenCaptureKit, no desktop or audio.
Raw capture: `~/projects/xenonrift/Logs/website-media/earth-fleet-raw.mp4` (~100 MB).
Player logs in same directory. Capture process stopped after recording.

Raw dimensions 1600×956; exports remove only 56px macOS title bar.
Video uses raw seconds 36.5–47.0; still uses raw second 40.5.
Original stays outside web repository.

Verification: production build passed; hero/landing/progressive tests 40/40 on desktop/mobile
Chromium (play/pause, reduced motion, Save-Data/2G, visibility, autoplay rejection, media error,
no-JavaScript still/enlargement, metadata and responsive layout). Integrated desktop/mobile
screenshots reviewed. Full suite: 138 passed, 12 failures in unrelated pre-existing untracked
`tests/downloads.spec.js` expecting download UI not present in homepage; left untouched.
Final PR-only isolated checkout (after fleet sync): `npm ci`, build and full test suite passed,
142/142, with no test exclusions. Unrelated local download files/tests are not part of PR.
Physical Safari/iOS not tested. Hero capture involved no game source changes or Unity test runs;
fleet-sync capture verification is recorded separately in [GAME_MEDIA.md](GAME_MEDIA.md).

Re-export (requires ffmpeg with libx264, Python with Pillow):
```sh
python tools/prepare-hero-media.py
# or supply another copy of this same raw recording:
python tools/prepare-hero-media.py /path/to/earth-fleet-raw.mp4
```
