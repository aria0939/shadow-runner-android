// src/config/constants.js
// Central tuning values for Shadow Runner. Keep all magic numbers here so the
// game can be re-balanced without hunting through systems.

export const GAME = {
  // Logical resolution. The canvas is scaled to fit the device while preserving
  // aspect ratio. We render at 1280x720 and use Phaser's SCALE.FIT.
  WIDTH: 1280,
  HEIGHT: 720,
  BACKGROUND_COLOR: '#05060a',
  // Physics target
  FPS: 60,
};

export const PHYSICS = {
  gravity: 1100,            // px/s^2
  walkSpeed: 220,           // px/s
  runSpeed: 340,            // px/s
  crouchSpeed: 80,
  jumpVelocity: -470,       // px/s (negative = up)
  variableJumpCutoff: -210, // when jump released early, velocity clamped to this
  maxFallSpeed: 720,
  // Acceleration / deceleration (px/s^2)
  groundAccel: 2200,
  groundDecel: 2600,
  airAccel: 1600,
  airDecel: 600,
  // Game-feel
  coyoteTime: 100,          // ms
  jumpBuffer: 120,          // ms
  turnAroundBoost: 1.35,    // multiplies decel when reversing direction
  // Dash
  dashSpeed: 720,
  dashDuration: 180,        // ms
  dashCooldown: 700,        // ms
  dashShadowEnergyCost: 25, // 0..100
  // Shadow Energy
  shadowEnergyMax: 100,
  shadowEnergyRegen: 4,     // per second
  shadowEnergyPickup: 20,
  // Combat
  invulnTime: 1200,         // ms after taking damage
  stompBounce: -360,
  hitStopSmall: 35,         // ms — enemy stomp
  hitStopMedium: 55,        // ms — boss hit
  hitStopLarge: 100,        // ms — final boss kill
  // Player health
  maxHealth: 3,
  // Lives
  coinsPerExtraLife: 100,
  startingLives: 3,
};

export const PLAYER_BODY = {
  // Physics body size. The offset is recomputed per-frame in Player.js based
  // on the current animation's frame dimensions, so the body stays anchored
  // to the hero's feet across all animation states.
  width: 56,
  height: 130,
};

export const COLORS = {
  // Cinematic dark palette
  bg: 0x05060a,
  ink: 0xe7e7ef,
  inkDim: 0x8a8aa8,
  shadow: 0x6a4cff,
  shadowBright: 0xb5a3ff,
  shadowDeep: 0x2a1f5e,
  hazard: 0xff4d6d,
  coin: 0xffd166,
  energy: 0x6ad1ff,
  health: 0xff5d8f,
  good: 0x6ee7b7,
};

export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  LEVEL_SELECT: 'LevelSelectScene',
  GAME: 'GameScene',
  PAUSE: 'PauseScene',
  GAME_OVER: 'GameOverScene',
  LEVEL_COMPLETE: 'LevelCompleteScene',
  SETTINGS: 'SettingsScene',
  CREDITS: 'CreditsScene',
};

export const LEVELS = [
  { id: 1, key: 'level01', name: 'Green Valley',     subtitle: 'A sunset walk into shadow',   bg: 'green-valley' },
  { id: 2, key: 'level02', name: 'Underground Escape', subtitle: 'Beneath the silent stone',  bg: 'underground' },
  { id: 3, key: 'level03', name: 'Sky Runner',        subtitle: 'Above the cloud line',       bg: 'sky' },
  { id: 4, key: 'level04', name: 'Dark Factory',      subtitle: 'Where the machines dream',   bg: 'factory' },
  { id: 5, key: 'level05', name: 'The Final Shadow',  subtitle: 'What waits at the end',      bg: 'final' },
];

export const SETTINGS_DEFAULTS = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.9,
  muted: false,
  screenShake: 1.0,
  touchOpacity: 0.55,
  touchSize: 1.0,
  debug: false,
};

export const DEBUG = {
  // Toggle dev overlay. Force-false in production via Vite define.
  enabled: false,
};
