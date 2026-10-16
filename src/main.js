// src/main.js
// Entry point. Boots Phaser, registers every scene, configures the renderer
// for crisp pixel art and landscape-fit scaling, and hides the HTML boot loader
// once the game canvas is ready.

import Phaser from 'phaser';
import { GAME, SCENES } from './config/constants.js';
import AudioSystem from './systems/AudioSystem.js';

import BootScene          from './scenes/BootScene.js';
import PreloadScene       from './scenes/PreloadScene.js';
import MainMenuScene      from './scenes/MainMenuScene.js';
import LevelSelectScene   from './scenes/LevelSelectScene.js';
import GameScene          from './scenes/GameScene.js';
import PauseScene         from './scenes/PauseScene.js';
import GameOverScene      from './scenes/GameOverScene.js';
import LevelCompleteScene from './scenes/LevelCompleteScene.js';
import SettingsScene      from './scenes/SettingsScene.js';
import CreditsScene       from './scenes/CreditsScene.js';
import RotateHint         from './systems/RotateHint.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: GAME.BACKGROUND_COLOR,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  antialiasGL: false,
  powerPreference: 'high-performance',
  scale: {
    // RESIZE mode: the canvas fills the entire screen (no black bars).
    // The game adapts to the device's actual aspect ratio (16:9, 18:9, 19.5:9,
    // 20:9, etc.). Scenes use this.scale.width / this.scale.height for layout.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    expandParent: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // gravity is applied per-player in Player.js
      debug: false,
    },
  },
  render: {
    pixelArt: true,
    roundPixels: true,
    transparent: false,
  },
  input: {
    activePointers: 5, // multi-touch for simultaneous left/right + jump + dash
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    LevelSelectScene,
    GameScene,
    PauseScene,
    GameOverScene,
    LevelCompleteScene,
    SettingsScene,
    CreditsScene,
  ],
};

const game = new Phaser.Game(config);

// Hide HTML boot loader once Phaser has booted.
game.events.once('ready', () => {
  const el = document.getElementById('boot-loader');
  if (el) el.classList.add('hidden');
});

// Activate the rotate-hint overlay on portrait orientation.
RotateHint.init();

// Make game accessible for debugging in dev tools.
if (typeof window !== 'undefined') {
  window.SHADOW_RUNNER = game;
  window.SHADOW_RUNNER_AUDIO = AudioSystem;
}

// Listen for app pause/resume — important for Capacitor on Android.
// NOTE: We do NOT pause on window 'blur' because on Android WebView a touch
// release can fire a brief blur event, which would immediately pause the
// game right after the user taps "Start Game". We only pause on actual
// visibility change (tab switch / app background).
function pauseGame() {
  const active = game.scene.getScenes(true)[0];
  if (active && active.scene.key === SCENES.GAME) {
    active.scene.pause();
    active.scene.launch(SCENES.PAUSE);
  }
}
function resumeGame() {
  // AudioContext is automatically resumed on user gesture in AudioSystem.
  // Try to resume if it was suspended.
  if (window.SHADOW_RUNNER_AUDIO) window.SHADOW_RUNNER_AUDIO.resume();
}

// Only pause when the page becomes actually hidden (app backgrounded).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
  else resumeGame();
});
// pagehide is fired when the user navigates away or app is backgrounded.
window.addEventListener('pagehide', pauseGame);

// Prevent right-click context menu on canvas (mobile long-press).
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent gesture zoom / double-tap zoom on mobile.
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

export default game;
