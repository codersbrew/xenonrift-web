# Xenon Rift Web — Tasks & Roadmap

## 1. Project Initialization & Asset Preparation
- [x] Inspect game repository (`~/projects/xenonrift`) for game lore, platform builds, stats, and visual assets
- [x] Initialize npm package with Vite
- [x] Prepare media assets: copy and optimize screenshots and concept art into `public/images/`
- [x] Set up downloads folder with links/symlinks to real macOS and Linux server packages
- [x] Create favicon and web manifest

## 2. Core Web Architecture & Design System
- [x] Establish Sci-Fi Space aesthetic:
  - Deep space color palette (Cosmic Black `#060810`, Void Navy `#0a0e1a`)
  - Faction signature accents: Cyan Vanguard `#00e5ff` / Ember Syndicate `#ff6600`
  - High-tech HUD typography (Space Grotesk, Orbitron / Rajdhani, JetBrains Mono)
  - Sci-fi borders, angled chamfers, scanlines, and glowing plasma effects
- [x] Build interactive Canvas Starfield:
  - Multi-layered parallax stars
  - Drifting nebula dust
  - Interactive warp speed effect on boost / scroll
- [x] Web Audio Sci-Fi Sound FX (synthesized UI clicks, warp hum, plasma bursts with mute toggle)

## 3. Informative Content & Structure
- [x] **Hero Section**:
  - Punchy title, subtitle, version badge (`v0.3.0 · Rift War Phase 1`)
  - Primary CTA buttons: "Download macOS", "iOS Beta", "View Flight Manual"
  - Live Server Status badge (`game.xenonrift.com:7770`) with copy button & latency meter
- [x] **Download Hub**:
  - **macOS Client & Server**: Direct download (`XenonRift-mac.zip`), Apple Silicon / Intel support, Gatekeeper bypass command
  - **iOS (iPhone & iPad)**: TestFlight link / direct build guide, gamepad controller requirement (Xbox / DualSense / MFi)
  - **Linux Dedicated Server**: Headless server tarball (`xenonrift-server-linux.tar.gz`), systemd service snippet, UDP port 7770
  - **Source Code**: GitHub link (`codersbrew/xenonrift`)
- [x] **The Rift War (Game Modes)**:
  - Team Deathmatch (10v10 to 100 kills)
  - Capture the Depot (60s zone hold)
  - Offense v Defense (20 shared life pool assault)
  - Drop-in/Drop-out persistent battle with intelligent bot backfilling
- [x] **The Factions**:
  - Cyan Vanguard vs. Ember Syndicate lore, visual emblems, and philosophies
- [x] **Flight Manual (Chassis & Weapons)**:
  - Interactive "Striker" ship schematic with specs (HP, Shields, Speed, Boost, Turn rate)
  - Twin synchronized Plasma Cannons specs
  - Control schemes guide (WASD + Mouse, Twin-Stick Gamepad, Classic Asteroids/Subspace, Face-Move)
- [x] **Media & Screenshots Gallery**:
  - High-resolution in-game screenshots with lightbox modal viewer
  - Concept art showcase (Orbital Hangar, Tactical War Room, Quantum Rift)
- [x] **Server Host & Connect Guide**:
  - Step-by-step how to connect to `game.xenonrift.com:7770`
  - Command-line flags reference (`-connect`, `-server`, `-faction`, `-teamsize`)
  - Automated deployment guide (`deploy-server.sh`)
- [x] **Footer**:
  - Domain branding `xenonrift.com`, GitHub, developer credits

## 4. Testing, Polish & Build
- [x] Verify responsive layout across mobile, tablet, and desktop
- [x] Verify all interactive elements (lightbox, sound synth, copy-to-clipboard, tabs)
- [x] Run `npm run build` to verify production bundle output in `dist/`
- [x] Test local preview server

## 5. Visual Identity & Key Art Options (User Request)
- [x] Generate 3 distinct high-res cinematic key art & logo options:
  - Option 1: Quantum Event Horizon (evolved concentric orbital rings)
  - Option 2: Faction War Collision (Cyan Vanguard vs. Ember Syndicate)
  - Option 3: Deep Void Tactical Outpost (orbital station & patrol fleet)
- [x] Integrate interactive Key Art Style Switcher on website hero section
- [x] Upgrade navbar brand SVG & favicon to concentric orbital rings aesthetic
- [x] Add full-resolution key art options to gallery with lightbox support
- [x] Present comparison artifact with side-by-side carousel and details
- [x] **Option 1 (Quantum Event Horizon)** selected by user:
  - Set as canonical hero key art (`public/images/hero/hero_key_art.jpg`)
  - Updated social OpenGraph and Twitter card previews
  - Locked in default hero frame showcase and gallery feature

## 6. GitHub Pages & Custom Domain Setup
- [x] Configure `vite.config.js` with relative base path (`base: './'`) for custom domain and repository subpaths
- [x] Create `public/CNAME` with `xenonrift.com`
- [x] Create automated GitHub Actions workflow (`.github/workflows/deploy.yml`)
- [x] Initialize Git repository and create clean initial commit on `main`
- [x] Point game downloads to official GitHub Releases asset URLs
- [x] Push to GitHub remote and enable GitHub Pages under Actions mode
- [x] Configure DNS A and CNAME records at domain registrar for `xenonrift.com` (Resolved & Active)
- [x] Enforce HTTPS on `xenonrift.com` via GitHub Pages SSL certificate
- [x] Streamline downloads to client-only (macOS & iOS) and remove Linux dedicated server card
