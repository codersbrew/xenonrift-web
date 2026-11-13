# Current game imagery and copy

Website sync: 2026-11-13. Source: clean sibling `../xenonrift` revision `3730af5`.
Hero video and fallback remain unchanged: [separate provenance](HERO_MEDIA.md).

## Copy sources

- `DEVELOPMENT_STATUS.md`: current scope and verification limits.
- `Assets/XenonRift/Scripts/Ships/ShipDefinition.cs`: canonical faction hull names.
- `Assets/XenonRift/Settings/ShipBalance.csv`: shared class tuning, weapons and specials.
- `Assets/XenonRift/Scripts/UI/MainMenu.Pilot.cs`: Hangar faction/class selection.
- `Assets/XenonRift/Scripts/UI/Galaxy/GalaxyScreen*.cs`: faction lock, deployment, war rank and away report.
- `Assets/XenonRift/Scripts/Audio/AnnouncerSettings.cs`: Essential / Full / Off; Essential default.
- `Assets/XenonRift/Scripts/GameModes/RiftZone.cs`: carrier launch reserve and fallback to base rift.

Six hulls, three classes; faction silhouettes and names differ, not class balance:

| Sol Alliance | Aphelion Collective | Primary | Special |
|---|---|---|---|
| Interceptor | Scythe | Pulse Scatter | Phase Dash |
| Striker | Crescent | Plasma Cannon | Weapon Overcharge |
| Dreadnought | Juggernaut | Railgun | Photon Torpedoes |

Replaced retired faction name and bronze imagery. Current map shows 15 Orion Spur rifts with
Ross 128 briefing, not old Kiln Gate. Do not promise verified hosted rollout of newer progression:
website explicitly identifies battle score, assists, war ranks and away report as development-build
features still being verified for playtests. Existing playtest availability/CTAs remain unchanged.

## Fresh captures

Unity 6000.3.27f2, graphics enabled. No Editor instance was open/connected, so used existing batch
capture entry points, not new game/editor source. No game asset or saved-scene changes.

```sh
GAME="$HOME/projects/xenonrift"
U=/Applications/Unity/Hub/Editor/6000.3.27f2/Unity.app/Contents/MacOS/Unity
"$U" -batchmode -projectPath "$GAME" \
  -executeMethod XenonRift.EditorTools.XenonOutpostBuilder.CaptureShipClassesFromCommandLine \
  -logFile "$GAME/Logs/web-six-ship-capture.log"
"$U" -batchmode -projectPath "$GAME" -runTests -testPlatform PlayMode \
  -assemblyNames XenonRift.Tests.PlayMode \
  -testFilter 'XenonRift.Tests.ScreenshotCapture.CaptureFleetBattleFrames;XenonRift.Tests.GalaxyTests.CaptureGalaxyScreens' \
  -testResults "$GAME/Logs/web-current-capture-results.xml" \
  -logFile "$GAME/Logs/web-current-capture.log"
python tools/prepare-images.py "$GAME"
```

Requires ffmpeg only for separate hero export; this image exporter requires Pillow.
Ship capture exits successfully and logs six models. Both PlayMode capture tests passed (2/2).
These are capture tests, not a full gameplay regression suite or real online playtest.

Exporter maps `ship_{Interceptor,Striker,Dreadnought}.png` to Sol hulls and corresponding
`ship_*_aphelion.png` to Scythe/Crescent/Juggernaut. All use same gameplay camera and scale.
Crop `(360, 105, 1240, 765)` removes labels, preserves full hulls/barrels; output 720×540 WebP.
Gallery exports `fleet_5_hud.png`, `fleet_1_engaged.png`, `galaxy_1_map.png` at source size + 800px.
Capture files stay in game `Logs/Screenshots/`; only optimized exports ship with website.

Visually reviewed all six crops and desktop/mobile layout. Browser console clean.
PR-only isolated checkout: `npm ci`, production build and full `npm test -- --workers=4` passed,
142/142 on desktop/mobile Chromium. No test exclusions in PR checkout; unrelated local download
implementation/tests remain untouched and are not part of this change. No deployment.
