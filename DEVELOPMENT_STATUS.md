# Website development status

## Current game state sync (2026-11-09)

Updated website copy, gameplay captures, controls, and legal deletion references to match the current game state (`../xenonrift` at `9f6ba39` / `8f21f37`).

### Updated in this refresh

- **Hero & gameplay screenshots**: Re-exported `public/images/gameplay/{rift-gate,fleet-hud,galaxy-map,fleet-arena,fleet,skirmish,combat,galaxy}{,-800}.webp` from current game captures (`Logs/Screenshots/`), showcasing the **Orbital Containment Ring (Xenon Rift)** with singularity beams in the hero and a 3-card in-engine showcase (**fleet-strip HUD**, **Persistent Galactic Map**, and **Fleet Battle Arena**) in `#fleet-battle`. Reviewed ship renders (`interceptor.webp`, `striker.webp`, `dreadnought.webp`) remain unchanged.
- **Signature primary weapons per fighter class**: Updated `#ships` cards to show each fighter's primary weapon alongside its special ability—**Interceptor: Pulse Scatter** (`3`-bolt `6°` spread, `40 u` range) + **Phase Dash**; **Striker: Plasma Cannon** (rapid mid-range single-bolt fire, `45 u` range) + **Weapon Overcharge** (`1.6×` fire rate); **Dreadnought: Railgun** (`110 u/s` long-range heavy rounds, `55 u` range) + **Photon Torpedoes** (`5×` vs capital ships, turrets, and launch bays).
- **Fleet Battle & Xenon Rift mechanics**: Updated `#fleet-battle` to reflect heavy anti-capital **main guns** and point-defense **turrets**, carrier-only **launch bays** with a **100-fighter reserve**, and base **Xenon Rift** orbital containment ring spawns with **double the respawn wait** when a carrier's bays are wrecked, its reserve is spent, or the carrier is sunk.
- **One side per war & durable galaxy**: Updated galactic war copy and onboarding steps to reflect per-cycle **faction lock** (pilots choose a side once per Rift Cycle until a capital falls and the galaxy re-forms) and database-persisted war state.
- **Main menu & onboarding flow**: Updated first-flight steps and FAQ to use the current menu structure (**Rift War**, **Practice** including **Offline Rift War**, **Hangar**, **Settings**, and **Pilot Profile** opened from the top-right pilot chip), plus Apple TV phone sign-in at `/link/`.
- **Touch controls & audio**: Replaced the outdated "no touch flight controls yet" notice with built-in floating twin-stick **touch controls** on iPhone, iPad, and Android (with **Auto / On / Off** and **Left-handed layout** in Settings), while keeping the controller requirement for Apple TV flight (Siri Remote navigates menus). Added a **Touch (phone / tablet)** column to the Flight Controls table and documented the three selectable **ship-computer announcer voices** (Female AI, Male AI, Tactical Droid).
- **Legal pages**: Updated account deletion path in `privacy/index.html` and `terms/index.html` from `Pilot → Account → Delete Account` to `Pilot Profile → Delete Account`, and included war-cycle faction choice in pilot profile disclosures.

---

## Previous refresh (`feat/current-game-site`)

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
