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

Node 22.12+ recommended. Tests run against production preview on port 4173, on desktop and mobile Chromium. Coverage includes local media, navigation, layout overflow, dialog keyboard/focus behavior, clipboard failure, platform disclosures, and reduced motion.

## Content rules

- Lead with gameplay and player choices, not engine/network implementation.
- Online arenas, offline practice, and experimental offline Rift War are separate experiences.
- Galaxy is session-only; shared online persistence is not available yet.
- iOS gameplay requires a Bluetooth controller; no touch flight controls yet.
- No public Mac release or TestFlight invite existed when this page was updated. Do not link to private game releases or generic TestFlight pages.
- Playtest CTAs open email to the developer's public GitHub contact address. They do not enroll users or guarantee access.
- Server address is setup information, not a health indicator.
- Gameplay images are in-engine development captures. Ship art is rendered from current game models.

Before enabling direct downloads, verify anonymously accessible assets, matching server/client versions, signing/notarization, minimum OS/device support, version, release date, and file size. Update availability copy and regression tests together. Real gameplay video can replace the hero capture when footage is available; don't present a screenshot slideshow as gameplay video.

## Refresh images

Source captures live in sibling game project, `../xenonrift/Logs/Screenshots/`.

```sh
python3 -m venv /tmp/xenonrift-web-images
/tmp/xenonrift-web-images/bin/pip install Pillow
/tmp/xenonrift-web-images/bin/python tools/prepare-images.py ../xenonrift
/tmp/xenonrift-web-images/bin/python tools/prepare-branding.py ../xenonrift
```

Script crops ship-only renders and exports responsive WebP captures to `public/images/ships/` and `public/images/gameplay/`. Original game files are untouched. Existing concept artwork is retained, but not labeled as gameplay.

Branding uses lettering extracted from the game's `Assets/XenonRift/Art/UI/XenonRift_KeyArt.png`. The game has no standalone transparent wordmark, so `prepare-branding.py` masks the flattened art, retaining original RGB bevels/neon colors. Header and footer share this asset; browser and Apple touch icons use its original X. Do not replace it with a substitute font or unrelated orbital icon. Review masks if source artwork changes.

## Deployment

PR checks build and run browser tests. Pushes to `main` run the same checks, then publish `dist/` through `.github/workflows/deploy.yml`. No backend, email collection, or live-status service is included.
