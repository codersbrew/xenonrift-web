# Xenon Rift Landing Website (`xenonrift.com`)

The official landing website and distribution portal for **Xenon Rift**, a persistent top-down multiplayer space arena shooter built with Unity 6 (URP) and FishNet dedicated server networking.

Domain: **[xenonrift.com](https://xenonrift.com)**  
Game Reference: `~/projects/xenonrift` (`https://github.com/codersbrew/xenonrift`)

---

## Features

- **Cool Sci-Fi Aesthetic:**
  - Interactive multi-layer Canvas Starfield with mouse parallax and Warp Hyperdrive mode.
  - Web Audio API procedural sound synthesizer (subtle UI clicks, laser bolts, and warp hum with persistent mute toggle).
  - Glowing HUD styling with angled chamfers, tactical targeting reticles, scanline overlays, and neon faction accents (Cyan Vanguard `#00f0ff` & Ember Syndicate `#ff6600`).
- **Comprehensive Game Breakdown:**
  - **Overview & Lore:** Persistent 10v10 battles, drop-in/drop-out matchmaking with intelligent bot backfill, and server-authoritative dedicated server at `game.xenonrift.com:7770`.
  - **The Rift War Modes:** Team Deathmatch (100 kills), Capture the Depot (60s cumulative hold), and Offense vs Defense (20 shared life pool).
  - **Faction Showcase:** Cyan Vanguard vs Ember Syndicate philosophies, colors, and combat doctrines.
  - **Interactive Flight Manual:** "Striker" vessel specs (Hull, Shields, Cruising speed, Afterburner boost, Twin Plasma Cannons) with an interactive schematic and live cannon test-fire simulator.
  - **Visual Gallery:** High-resolution in-game screenshots and concept art with keyboard-navigable Lightbox viewer.
- **Cross-Platform Downloads Hub:**
  - **macOS:** Direct download for `XenonRift-mac.zip` (client & server in one universal app), Gatekeeper tips (`xattr -dr com.apple.quarantine XenonRift.app`).
  - **iOS (iPhone & iPad):** TestFlight beta request, controller requirements (Bluetooth Xbox, DualSense, Switch Pro, MFi), local network permission notes, and automated Xcode deploy script (`Tools/ios-build.sh`).
  - **Linux Dedicated Server:** Direct download for `xenonrift-server-linux.tar.gz`, systemd service unit snippet, and automated deploy script (`Tools/deploy-server.sh`).
  - **Source Code:** GitHub repository reference (`codersbrew/xenonrift`).
- **Server Infrastructure Guide:**
  - Quick connect guide to official cluster: `game.xenonrift.com:7770`.
  - Copyable CLI command snippets and self-hosting instructions.

---

## Quick Start (Development)

```sh
# Install dependencies
npm install

# Start local dev server (default: http://localhost:5173)
npm run dev

# Build production bundle into dist/
npm run build

# Preview production build locally (default: http://localhost:4173)
npm run preview
```

---

## Production Deployment

The project builds into a completely static distribution folder (`dist/`) with zero backend dependencies:

1. **Deploying to Cloudflare Pages / Vercel / Netlify:**
   - Build command: `npm run build`
   - Output directory: `dist`
2. **Deploying to Nginx / Caddy on `xenonrift.com`:**
   - Point your web server root to the `dist/` directory.
   - For direct game downloads, place `XenonRift-mac.zip` and `xenonrift-server-linux.tar.gz` in `dist/downloads/` (already configured via symlinks from `~/projects/xenonrift/Builds`).
