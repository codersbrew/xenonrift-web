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
- Lead mode is 12v12 Fleet Battle: each faction has a carrier and two or three destroyers; destroy every enemy capital ship to take the rift. No match clock.
- Factions are Sol Alliance and Zhurak Hegemony. The dedicated online galaxy persists and bots keep battles moving; offline Practice is separate and needs no sign-in.
- Current specials: Phase Dash, Weapon Overcharge, Photon Torpedoes. Space/Shift and either gamepad bumper activate the class special; ordinary boost is disabled.
- Multiplayer uses account sign-in and the galactic map, not manual server-address entry. Do not promise per-cycle faction enforcement; it remains unfinished.
- iPhone/iPad and Apple TV gameplay requires a compatible controller; no touch flight controls, and Siri Remote alone is unsupported.
- No published release was returned by GitHub when this refresh was checked. Keep email playtest CTAs; do not invent direct downloads, a public TestFlight invite, App Store availability, or launch dates.
- Playtest, support, and contact links use `support@codersbrew.com`. They do not enroll users or guarantee access.
- Public legal pages: `/privacy/` and `/terms/`. See [LEGAL_CONTENT.md](LEGAL_CONTENT.md) for scope, maintenance, and release review.
- The website does not show live server status. The game checks galaxy availability and build compatibility.
- Gameplay images are in-engine development captures, labeled as such. The Fleet Battle hero replaces old station/boost captures. Ship art is unchanged and rendered from game models.

Before enabling direct downloads, verify anonymously accessible assets, matching server/client versions, signing/notarization, minimum OS/device support, version, release date, and file size. Update availability copy and regression tests together. Real gameplay video can replace the hero capture when footage is available; don't present a screenshot slideshow as gameplay video.

## Refresh images

Source captures live in sibling game project, `../xenonrift/Logs/Screenshots/`.

```sh
python3 -m venv /tmp/xenonrift-web-images
/tmp/xenonrift-web-images/bin/pip install Pillow
/tmp/xenonrift-web-images/bin/python tools/prepare-images.py ../xenonrift
/tmp/xenonrift-web-images/bin/python tools/prepare-branding.py ../xenonrift
```

Script crops ship-only renders and exports responsive WebP captures to `public/images/ships/` and `public/images/gameplay/`. Original game assets are untouched. Existing concept artwork is retained, but not labeled as gameplay.

### Fleet Battle hero

Export only the current fleet image without replacing reviewed ship renders or older media:

```sh
/tmp/xenonrift-web-images/bin/python tools/prepare-images.py /path/to/game-capture-worktree --fleet-only
```

Requires `Logs/Screenshots/fleet_2_cyan_fleet.png`. Current export uses the 1600×900 capture from `../xenonrift-turrets` at game revision `57fe17a` (merged into game main `741b7ec`). Full frame is preserved; exports are 1600 and 800 pixels wide. Old captures remain available as historical assets but are not linked from the refreshed homepage.

### Refresh ships after a game model change

`Logs/Screenshots/ship_*.png` are cached review renders, **not live prefab previews**. Re-exporting them alone can publish obsolete ships. Close the game Editor, then render current prefabs before exporting (graphics required; do not add `-nographics`):

```sh
U=/Applications/Unity/Hub/Editor/6000.3.25f1/Unity.app/Contents/MacOS/Unity
"$U" -batchmode -projectPath "$PWD/../xenonrift" \
  -executeMethod XenonRift.EditorTools.XenonOutpostBuilder.CaptureShipClassesFromCommandLine \
  -logFile Logs/web-ship-capture.log
/tmp/xenonrift-web-images/bin/python tools/prepare-images.py ../xenonrift --ships-only
```

Capture method uses a temporary scene and exits Unity without saving assets. Ship exports currently use game revision `70f2e86` (Interceptor, tactical Striker, siege Dreadnought), cropped from 1600×900 three-quarter renders to `(430, 200, 1150, 740)`. Review all three silhouettes against current game prefabs before publishing; adjust crop if new geometry extends beyond it. Cards preserve full 4:3 images on desktop and mobile. `tests/ships.spec.js` pins reviewed WebP hashes; update them only after reviewing refreshed renders.

Branding uses lettering extracted from the game's `Assets/XenonRift/Art/UI/XenonRift_KeyArt.png`. The game has no standalone transparent wordmark, so `prepare-branding.py` masks the flattened art, retaining original RGB bevels/neon colors. Header and footer share this asset; browser and Apple touch icons use its original X. Do not replace it with a substitute font or unrelated orbital icon. Review masks if source artwork changes.

## Deployment

PR checks build and run browser tests. Pushes to `main` run the same checks, then publish `dist/` through `.github/workflows/deploy.yml`. No backend, email collection, or live-status service is included.
