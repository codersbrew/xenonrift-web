# Xenon Rift landing page

Consumer-facing site for [xenonrift.com](https://xenonrift.com/). Static Vite site; GitHub Pages deploys `main`.

## Develop & test

```sh
npm ci
npm run dev
npm run build
npx playwright install chromium
npm test
```

Node 22.12+ recommended. Tests run against production preview on port 4173, on desktop and mobile Chromium. Coverage includes current gameplay claims, local media, navigation, layout overflow, dialog keyboard/focus behavior, platform disclosures, reduced motion, account links, and legal pages. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for this refresh and validation.

## Content rules

- Lead with gameplay and player choices, not engine/network implementation.
- Lead mode is 12v12 Fleet Battle: each faction has a carrier and two or three destroyers armed with heavy main guns and point-defense turrets; destroy every enemy capital ship to take the rift. No match clock.
- Only the carrier has launch bays and holds a 100-fighter reserve. If the carrier's bays are wrecked, its 100-fighter reserve is spent, or the carrier is sunk, pilots warp in from their base Xenon Rift (an orbital containment ring) with double the respawn wait.
- Factions are Sol Alliance and Aphelion Collective. Pilots choose one side per Rift Cycle (faction lock until a capital falls and the galaxy re-forms). The dedicated online galaxy persists in the database and bots keep battles moving; offline Practice (Fleet Battle, Team Deathmatch, or Offline Rift War) is separate and needs no sign-in.
- Six faction hulls share three class loadouts and stats: Sol Alliance fields **Interceptor / Striker / Dreadnought**; Aphelion Collective fields **Scythe / Crescent / Juggernaut**, respectively. These are distinct models, not six independently balanced classes.
- Current fighter loadouts: Interceptor (Scythe) pairs **Pulse Scatter** (3-bolt close-range spread) with **Phase Dash** (reduced incoming damage while dashing); Striker (Crescent) pairs **Plasma Cannon** (rapid mid-range fire) with **Weapon Overcharge** (`1.6×` fire rate); Dreadnought (Juggernaut) pairs **Railgun** (high-velocity long-range heavy rounds) with **Photon Torpedoes** (3-torpedo salvo dealing `5×` damage to capital ships, turrets, and bays). Space/Shift, either gamepad bumper, or the touch Special button activates the class special; ordinary boost is disabled.
- Main menu uses Rift War (online multiplayer), Practice, Hangar (ship selection), Settings (controller, touch, audio/announcer voices), and the top-right Pilot Profile chip (call sign, account sign-in/sign-out, career stats, account deletion).
- iPhone, iPad, and Android support built-in floating twin-stick touch controls (with Auto/On/Off and Left-handed options in Settings) or a compatible controller. Apple TV requires a compatible controller to fly (Siri Remote navigates menus, and pilots can sign in from a phone at `/link/`; Siri Remote alone cannot fly).
- No published release was returned by GitHub when this refresh was checked. Keep the Apple TestFlight waitlist form and `mailto:` playtest CTAs; do not invent direct downloads, a public `testflight.apple.com` invite link, App Store availability, or launch dates.
- TestFlight waitlist signups post to `supabase/functions/testflight-signup` (stored in `private.testflight_signups` in Supabase Postgres, with optional Resend Contacts sync and one-time confirmation email; see [TESTFLIGHT_SIGNUP_PLAN.md](TESTFLIGHT_SIGNUP_PLAN.md)). Direct playtest, support, and opt-out links use `support@codersbrew.com`; neither guarantees immediate access.
- Public legal pages: `/privacy/` and `/terms/`. See [LEGAL_CONTENT.md](LEGAL_CONTENT.md) for scope, maintenance, and release review.
- The website does not show live server status. The game checks galaxy availability and build compatibility.
- Gameplay images and video are in-engine development captures, labeled as such. Hero uses a silent 10.5-second Fleet Battle video over Earth with responsive still fallback; footage is offline bot gameplay. Ship art is rendered from game models.

Before enabling direct downloads, verify anonymously accessible assets, matching server/client versions, signing/notarization, minimum OS/device support, version, release date, and file size. Update availability copy and regression tests together. Use real gameplay footage, not screenshot slideshows presented as gameplay video.

## Refresh images

Source captures live in sibling game project, `../xenonrift/Logs/Screenshots/`.

```sh
python3 -m venv /tmp/xenonrift-web-images
/tmp/xenonrift-web-images/bin/pip install Pillow
/tmp/xenonrift-web-images/bin/python tools/prepare-images.py ../xenonrift
/tmp/xenonrift-web-images/bin/python tools/prepare-branding.py ../xenonrift
```

Script exports all six ship renders plus current fleet HUD, arena and galaxy map to `public/images/ships/` and `public/images/gameplay/`. Hero video/still are handled separately and never overwritten by this script. Original game assets are untouched. Existing concept artwork is retained, but not labeled as gameplay. See [current game-media sources and capture commands](tools/GAME_MEDIA.md).

### Gameplay video hero

Hero media lives in `public/videos/earth-fleet-gameplay.mp4` and `public/images/gameplay/earth-fleet{,-800}.webp`.
`src/hero-video.js` progressively loads muted, inline, looping video only when visible. Reduced-motion,
data-saving, and very slow connections default to still with manual play available. Playback pauses
when off-screen or tab is hidden; manual pause is preserved. Failed/blocked playback and no JavaScript
leave still/enlargement link usable. Social previews use matching still.

See [media provenance and export commands](tools/HERO_MEDIA.md). Re-export with
`python tools/prepare-hero-media.py` (Pillow and ffmpeg required).

### Fleet Battle gallery captures

Export only fleet/gallery images without replacing reviewed ship renders or older media:

```sh
/tmp/xenonrift-web-images/bin/python tools/prepare-images.py /path/to/game-capture-worktree --fleet-only
```

Requires `Logs/Screenshots/{fleet_5_hud,fleet_1_engaged,galaxy_1_map}.png`. Current exports were freshly captured from game revision `3730af5` (2026-11-13): cyan Sol Alliance and magenta Aphelion fleets, plus the current 15-rift Orion Spur map with Ross 128 selected. Full frames are preserved; responsive versions are 800px wide. Older captures remain as historical assets but are not linked from homepage.

### Refresh ships after a game model change

`Logs/Screenshots/ship_*.png` are cached review renders, **not live prefab previews**. Re-exporting them alone can publish obsolete ships. Close the game Editor, then render current prefabs before exporting (graphics required; do not add `-nographics`):

```sh
U=/Applications/Unity/Hub/Editor/6000.3.27f2/Unity.app/Contents/MacOS/Unity
"$U" -batchmode -projectPath "$PWD/../xenonrift" \
  -executeMethod XenonRift.EditorTools.XenonOutpostBuilder.CaptureShipClassesFromCommandLine \
  -logFile Logs/web-ship-capture.log
/tmp/xenonrift-web-images/bin/python tools/prepare-images.py ../xenonrift --ships-only
```

Capture method uses a temporary scene and exits Unity without saving assets. Ship exports currently use game revision `3730af5`: all six faction hulls, with identical gameplay camera angle/scale, cropped from 1600×900 renders to `(360, 105, 1240, 765)` and resized to 720×540. Crop preserves complete hulls and nose barrels, removing labels. Review every silhouette before publishing; adjust crop if geometry extends beyond it. Cards preserve full 4:3 images on desktop and mobile. `tests/ships.spec.js` pins all six reviewed WebP hashes; update them only after reviewing refreshed renders.

Branding uses lettering extracted from the game's `Assets/XenonRift/Art/UI/XenonRift_KeyArt.png`. The game has no standalone transparent wordmark, so `prepare-branding.py` masks the flattened art, retaining original RGB bevels/neon colors. Header and footer share this asset; browser and Apple touch icons use its original X. Do not replace it with a substitute font or unrelated orbital icon. Review masks if source artwork changes.

## Deployment

PR checks build and run browser tests. Pushes to `main` run the same checks, then publish `dist/` through `.github/workflows/deploy.yml`. Account links (`/auth/`, `/link/`) and the TestFlight waitlist form (`/#play`) call the hosted Supabase project using only the public anon key; deploy the matching Supabase migration and Edge Function before merging backend-dependent changes (see [TESTFLIGHT_SIGNUP_PLAN.md](TESTFLIGHT_SIGNUP_PLAN.md)).
