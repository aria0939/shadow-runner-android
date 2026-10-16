# Shadow Runner: Pixel Adventure

A premium 2D cinematic pixel-art action platformer for Android, built with **Phaser 3 + Vite + Capacitor**.

Guide the hero through five visually distinct worlds — Green Valley, Underground Escape, Sky Runner, Dark Factory, and The Final Shadow — collecting coins and Shadow Energy, defeating creatures, discovering secret areas, unlocking abilities, and ultimately fighting The Final Shadow.

![Shadow Runner](public/assets/backgrounds/green-valley-parallax.png)

## Features

- **Five complete levels** with unique moods and mechanics
- **Polished movement**: acceleration, deceleration, coyote time (100ms), jump buffer (120ms), variable jump height, turn-around boost, terminal velocity, squash-and-stretch landing
- **Shadow Dash** — signature burst mechanic with cooldown, energy cost, afterimage trail, camera impulse
- **Animation state machine** — IDLE / WALK / RUN / JUMP / FALL / CROUCH / HIT / DEATH / DASH, with flicker-free transitions and stable physics body across all animations
- **Five enemy types**: Walker, Shell Crawler (defensive), Flying Shadow (swooping), Shadow Hunter (aggressive AI), and **The Final Shadow** boss with three phases
- **Combat**: stomp from above (bounce), side contact damages player, invulnerability frames, hit-stop on meaningful impacts
- **Checkpoints** with save persistence, **save system** (localStorage + Capacitor Preferences)
- **Mobile-first touch controls**: translucent on-screen LEFT / RIGHT / JUMP / DASH / RUN / CROUCH buttons with multi-touch support
- **Cinematic camera**: smooth interpolation, horizontal look-ahead, vertical damping, dead zone, landing/dash/damage impulses
- **Multi-layer parallax** background system with atmospheric particles (dust, ash, sparks, fog)
- **HUD**: shadow-heart health, coin counter, score, shadow energy bar, level name, power-up timers, boss health bar
- **Five power-ups**: Speed Boost, Double Jump, Shield, Coin Magnet, Shadow Mode
- **Procedural audio engine** — all SFX and music generated via WebAudio (no external/copyrighted audio)
- **Settings menu**: master/music/sfx volume, mute, screen shake, touch opacity/size — all persisted
- **Landscape-only fullscreen** with immersive mode on Android
- **Rotate hint** overlay if device is in portrait

## Tech Stack

| Layer | Tech |
|-------|------|
| Game engine | Phaser 3.90 |
| Bundler | Vite 5 |
| Language | JavaScript (ES modules) |
| Native wrapper | Capacitor 6 |
| Android build | Gradle (AGP via Capacitor) |
| Min Android | 7.0 (API 24) |
| Target Android | 16 (API 36) |
| Audio | WebAudio (procedural) |
| CI/CD | GitHub Actions |

## Project Structure

```
shadow-runner-android/
├── index.html                  # Entry HTML with boot loader + rotate hint
├── package.json
├── vite.config.js
├── capacitor.config.json
├── .github/workflows/
│   └── android-build.yml       # CI: builds APK + creates GitHub Release on tag
├── android/                    # Native Android project (Capacitor)
│   └── app/
│       ├── src/main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/com/aria/shadowrunner/MainActivity.java
│       │   └── res/            # App icon, splash, styles, strings
│       └── build.gradle
├── public/
│   └── assets/
│       ├── data/asset-manifest.json
│       ├── sprites/            # Hero animation sheets (7 states)
│       ├── enemies/            # 4 enemy sheets
│       ├── tiles/              # 16 individual terrain pieces
│       ├── pickups/            # 38 sliced pickup sprites
│       └── backgrounds/        # Parallax panorama
└── src/
    ├── main.js                 # Phaser bootstrap
    ├── config/
    │   ├── constants.js        # All tunable values
    │   └── animations.js       # Animation metadata
    ├── scenes/
    │   ├── BootScene.js
    │   ├── PreloadScene.js
    │   ├── MainMenuScene.js
    │   ├── LevelSelectScene.js
    │   ├── GameScene.js
    │   ├── PauseScene.js
    │   ├── GameOverScene.js
    │   ├── LevelCompleteScene.js
    │   ├── SettingsScene.js
    │   └── CreditsScene.js
    ├── entities/
    │   ├── Player.js
    │   ├── Enemy.js
    │   ├── Walker.js
    │   ├── ShellCrawler.js
    │   ├── FlyingShadow.js
    │   ├── ShadowHunter.js
    │   └── FinalBoss.js
    ├── systems/
    │   ├── InputSystem.js
    │   ├── TouchControls.js
    │   ├── AudioSystem.js
    │   ├── SaveSystem.js
    │   ├── ParticleSystem.js
    │   ├── CameraSystem.js
    │   ├── CombatSystem.js
    │   ├── PowerupSystem.js
    │   └── RotateHint.js
    ├── ui/
    │   ├── HUD.js
    │   ├── MobileControls.js
    │   └── DialogBox.js
    └── levels/
        ├── index.js
        ├── level01.js  ...  level05.js
```

## Development Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Run in browser (development)

```bash
npm install
npm run dev
```

Open the printed URL in a browser. The game runs at 1280×720 logical resolution and scales to fit the viewport. Use keyboard controls (see below).

### Production web build

```bash
npm run build
npm run preview
```

The built bundle is in `dist/`.

## Controls

### Keyboard (development)

| Action | Keys |
|--------|------|
| Move | A / D, ← / → |
| Jump | Space, W, ↑ |
| Sprint | Shift |
| Crouch | S, ↓ |
| Shadow Dash | E |
| Pause | Esc |
| Restart | R |

### Touch (Android)

- **Left side**: virtual LEFT / RIGHT buttons (+ smaller RUN / CROUCH)
- **Right side**: JUMP and DASH buttons
- **Top-right**: small pause (II) button
- Multi-touch supported — jump while moving, dash while jumping

## Android Build

### Prerequisites

- Android Studio (or just command-line tools)
- Java JDK 21
- Android SDK with platform-tools, build-tools 36.0.0, platforms;android-36

### Build the APK locally

```bash
# 1. Build the web assets and sync to native project
npm run cap:sync

# 2. Build the debug APK
cd android
./gradlew assembleDebug

# 3. (Optional) Build the release APK (unsigned)
./gradlew assembleRelease
```

The APK appears at:
- `android/app/build/outputs/apk/debug/Shadow-Runner-v1.0-debug.apk`
- `android/app/build/outputs/apk/release/Shadow-Runner-v1.0-release-unsigned.apk`

### Open in Android Studio

```bash
npm run cap:sync
npx cap open android
```

### Install on a connected device

```bash
adb install -r android/app/build/outputs/apk/debug/Shadow-Runner-v1.0-debug.apk
```

## CI/CD via GitHub Actions

The workflow at `.github/workflows/android-build.yml` runs on every push to `main` / `master` and on every `v*` tag. It:

1. Checks out the repository
2. Installs Node + Java + Android SDK
3. Builds the Vite bundle
4. Syncs Capacitor
5. Builds debug + release APKs via Gradle
6. Uploads APKs as workflow artifacts
7. On tag push, creates a GitHub Release with the APKs attached

### First release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The release APK will appear under [Releases](../../releases) once the workflow completes.

## App Identity

- **App name**: Shadow Runner
- **Package**: `com.aria.shadowrunner`
- **Min Android**: 7.0 (API 24)
- **Target Android**: 16 (API 36)
- **Orientation**: Landscape (locked)
- **Display**: Fullscreen immersive mode

## Asset Pipeline

The supplied art pack is processed by `scripts/process_assets.py` (kept outside the repo). This script:

1. Loads each hero animation frame, trims transparent borders, and packs into 7 normalized spritesheets with bottom-aligned feet anchor
2. Builds 4 enemy spritesheets (one per enemy type)
3. Slices the pickups-and-effects atlas into individual sprites via alpha-based connected-component analysis
4. Copies terrain tiles and background panorama
5. Writes a manifest (`public/assets/data/asset-manifest.json`) consumed by `PreloadScene`

To regenerate game assets after modifying the source pack:

```bash
python3 scripts/process_assets.py
```

## Save System

Player progress is persisted via `localStorage` (web) and Capacitor Preferences (Android). Saved data:

- Highest unlocked level
- Per-level completion (fragments collected, best time, best score)
- Cumulative coins and score
- Active checkpoint (level + position)
- All settings (volume, mute, screen shake, touch opacity/size)

## Audio

All audio is **procedurally generated** via the WebAudio API in `src/systems/AudioSystem.js`. No external audio files are used, so there are zero copyrighted assets. SFX include: jump, land, coin, dash, damage, enemy defeat, death, power-up, checkpoint, level complete, boss hit, boss phase, boss defeat, menu select/back. Each level has its own atmospheric musical identity (root note + scale + BPM + timbre).

## Performance

- Pixel-perfect rendering (`pixelArt: true`, `roundPixels: true`)
- Object pooling for particles
- Sleeping enemies when off-screen (via Phaser culling)
- Single chunk for Phaser (no per-frame module loading)
- 60 FPS target on mid-range Android (4GB RAM / Snapdragon-class)

## Known Limitations

- Release APK is **unsigned** in CI — sign with your own keystore before publishing to Play Store
- Shadow Echo signature feature is implemented as a visual replay hook (UI hook is exposed via `Player.triggerEchoReplay()` but not auto-triggered in levels, per design directive to avoid overuse)
- Level editor is not included (per spec: "do not delay the finished game just to build the editor")
- AudioContext requires a user gesture before starting (browser autoplay policy); the game resumes audio on first tap

## License

MIT License — see [LICENSE](LICENSE). Original code and procedural audio. Art assets supplied as part of the project's source pack.

## Credits

- Design / Code / Art Integration: **aria0939**
- Tech: Phaser 3, Vite, Capacitor, Android Gradle
- Audio: Procedural WebAudio engine (original)
- Original art asset pack: hero, enemies, tiles, pickups, background panorama
