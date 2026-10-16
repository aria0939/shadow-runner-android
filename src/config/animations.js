// src/config/animations.js
// Animation metadata for the hero. Frame dimensions are read from the asset
// manifest at preload time, so this file only describes per-state timing and
// repeat behaviour. Key naming must match the spritesheets produced by
// scripts/process_assets.py:  hero-idle, hero-walk, hero-run, hero-jump,
// hero-fall, hero-crouch-hit, hero-death.

export const HERO_ANIMATIONS = [
  { key: 'hero-idle',       sheetKey: 'hero-idle',       frameRate: 8,  repeat: -1 },
  { key: 'hero-walk',       sheetKey: 'hero-walk',       frameRate: 12, repeat: -1 },
  { key: 'hero-run',        sheetKey: 'hero-run',        frameRate: 16, repeat: -1 },
  { key: 'hero-jump',       sheetKey: 'hero-jump',       frameRate: 14, repeat: 0 },
  { key: 'hero-fall',       sheetKey: 'hero-fall',       frameRate: 10, repeat: 0 },
  { key: 'hero-crouch-hit', sheetKey: 'hero-crouch-hit', frameRate: 10, repeat: 0 },
  { key: 'hero-death',      sheetKey: 'hero-death',      frameRate: 10, repeat: 0 },
];

export const ENEMY_ANIMATIONS = {
  walker:        { key: 'walker-walk',       frameRate: 8,  repeat: -1, sheetKey: 'enemy-walker' },
  'shell-crawler': { key: 'shell-walk',       frameRate: 6,  repeat: -1, sheetKey: 'enemy-shell-crawler' },
  'flying-shadow': { key: 'flying-fly',       frameRate: 10, repeat: -1, sheetKey: 'enemy-flying-shadow' },
  'shadow-hunter': { key: 'hunter-walk',      frameRate: 9,  repeat: -1, sheetKey: 'enemy-shadow-hunter' },
};

// Map an animation state name to a Phaser animation key.
export function heroAnimKey(state) {
  switch (state) {
    case 'IDLE':   return 'hero-idle';
    case 'WALK':   return 'hero-walk';
    case 'RUN':    return 'hero-run';
    case 'JUMP':   return 'hero-jump';
    case 'FALL':   return 'hero-fall';
    case 'CROUCH': return 'hero-crouch-hit';
    case 'HIT':    return 'hero-crouch-hit';
    case 'DEATH':  return 'hero-death';
    case 'DASH':   return 'hero-run';   // dash reuses run frame visually
    default:       return 'hero-idle';
  }
}
