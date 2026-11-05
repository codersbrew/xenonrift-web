# Website development status

## Current game refresh

Branch `feat/current-game-site`, based on updated website `main` / `origin/main` at `594bedd` (merged legal pages). Worktree: `../xenonrift-web-refresh`. Original website checkout's unrelated download/template work remains untouched.

### Implemented

- Reduced homepage to four sections: game introduction, Fleet Battle/galaxy overview, three ships, and playtesting/getting started.
- Updated game facts: 12v12 fighter teams; Sol Alliance and Zhurak Hegemony; carrier plus 2–3 destroyers; destructible turrets/bays; no Fleet Battle clock; dedicated persistent galaxy; bots fill empty slots and fight while pilots are away.
- Updated specials: Phase Dash, Weapon Overcharge, Photon Torpedoes. Controls now map Space/Shift or either bumper to the class special, not ordinary boost.
- Multiplayer instructions now use Google/Apple/email account sign-in, unique call signs, the galactic map and Drop In. Removed manual server address/copy widget.
- Kept offline Fleet Battle and Team Deathmatch practice, controller requirements, support contact, and links to privacy/terms. Added Apple TV testing disclosure (controller required; Siri Remote alone unsupported).
- Removed retired modes, old faction names, session-only online-galaxy claims, extra image galleries and animated background. Homepage remains usable without JavaScript; image link opens full capture without script and uses optional keyboard-accessible dialog with script.
- Simplified shared CSS and homepage JavaScript; no added npm packages or runtime services. Account/legal page content unchanged.
- Replaced old hero screenshot with Fleet Battle WebP exports (1600/800 px), preserving full frame. Existing reviewed ship renders and their hashes unchanged.

### Sources and availability

Gameplay facts checked against game `DEVELOPMENT_STATUS.md`, `README.md`, current menu code and ship tuning at game main `741b7ec`. Prefer latest fleet entries over older historical sections in the game status file.

Fleet image source: `../xenonrift-turrets/Logs/Screenshots/fleet_2_cyan_fleet.png`, captured for `57fe17a`, which is merged into game main. Reviewed source and exported image; no new Unity capture or game change performed. Re-export command is documented in README and `tools/prepare-images.py --fleet-only`.

GitHub release list was empty when checked; latest-release lookup also returned no release. Kept email playtest requests rather than inventing a download, public TestFlight link, or store release. Google sign-in is implemented and user-reported working; this website change does not independently validate hosted auth, accounts, server availability, or Apple TV sign-in.

### Verification

- `npm ci`: succeeded; audit reported no vulnerabilities.
- `npm run build`: succeeded, including privacy, terms and both account routes.
- `npm test -- --workers=4`: **62/62 passed**, desktop and mobile Chromium.
- Tests cover current/retired gameplay claims, metadata, 320–1440 px overflow checks, local media, reviewed ship hashes, screenshot dialog keyboard/backdrop behavior, JavaScript-free content/navigation, correct support links, legal documents and mocked email-account flows.
- Desktop/mobile homepage screenshots reviewed via Playwright CLI; console had no errors or warnings.
- No deployment, publication, Unity game edit or hosted configuration change performed.

### Known limits / next steps

- Review content, then open PR and merge through existing Pages workflow.
- Confirm hosted game/build availability before replacing email playtest requests with downloads.
- Older screenshot/concept files remain as historical assets but are not linked by refreshed homepage. Replace Fleet Battle capture later if cleaner in-game footage becomes available.
- Legal owner-review checklist in `LEGAL_CONTENT.md` still applies.
- Automated browser coverage uses Chromium, not physical Safari/iOS/tvOS hardware.
