// src/scenes/PreloadScene.js
// Loads the asset manifest, then every sprite / tile / pickup / background.
// Creates Phaser animations for the hero and all enemies.
// Shows a pixel-art progress bar while loading.

import Phaser from 'phaser';
import { SCENES, COLORS } from '../config/constants.js';
import { HERO_ANIMATIONS, ENEMY_ANIMATIONS } from '../config/animations.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super(SCENES.PRELOAD); }

  preload() {
    const W = this.scale.width, H = this.scale.height;

    // Pixel-art progress bar
    const barW = 480, barH = 14;
    const barX = (W - barW) / 2, barY = H / 2;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.shadowDeep, 1);
    bg.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    bg.fillStyle(0x111122, 1);
    bg.fillRect(barX, barY, barW, barH);

    const fill = this.add.graphics();

    const title = this.add.text(W / 2, barY - 50, 'SHADOW RUNNER', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '32px',
      color: '#e7e7ef',
      stroke: '#6a4cff',
      strokeThickness: 4,
    }).setOrigin(0.5).setLetterSpacing(8);

    const sub = this.add.text(W / 2, barY + 36, 'Loading…', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '13px',
      color: '#8a8aa8',
    }).setOrigin(0.5).setLetterSpacing(4);

    this.load.on('progress', (v) => {
      fill.clear();
      fill.fillStyle(COLORS.shadow, 1);
      fill.fillRect(barX, barY, barW * v, barH);
      fill.fillStyle(COLORS.shadowBright, 1);
      fill.fillRect(barX + barW * v - 4, barY, 4, barH);
      sub.setText(`Loading ${Math.floor(v * 100)}%`);
    });
    this.load.on('complete', () => {
      this.tweens.add({ targets: [title, sub, bg, fill], alpha: 0, duration: 220 });
    });

    // ---- Fetch asset manifest produced by scripts/process_assets.py ----
    this.load.json('asset-manifest', 'assets/data/asset-manifest.json');

    // ---- Background ----
    this.load.image('bg-green-valley', 'assets/backgrounds/green-valley-parallax.png');

    // ---- Hero spritesheets (load after manifest — but Phaser defers actual
    //      fetch until .start() so we can use manifest data here). We use a
    //      two-step: register loads from manifest synchronously, Phaser will
    //      fetch them this same preload pass.
    this.load.once('filecomplete-json-asset-manifest', (key, type, data) => {
      this._manifest = data;
      this._queueAssetsFromManifest(data);
    });
    // Fallback: if filecomplete fires before listener attached, use load.once addlistener after
    this.events.once('preupdate', () => {
      if (!this._manifest && this.cache.json.has('asset-manifest')) {
        this._manifest = this.cache.json.get('asset-manifest');
      }
    });
  }

  _queueAssetsFromManifest(m) {
    // ---- Master hero spritesheet (single texture for all states) ----
    if (m.hero_master) {
      this.load.spritesheet('hero-master', 'assets/sprites/hero-master.png', {
        frameWidth: m.hero_master.frameWidth,
        frameHeight: m.hero_master.frameHeight,
      });
    }
    // Hero sheets (kept for compatibility — not used at runtime anymore)
    for (const state in m.hero) {
      const meta = m.hero[state];
      this.load.spritesheet(`hero-${state}`, `assets/sprites/hero-${state}.png`, {
        frameWidth: meta.frameWidth,
        frameHeight: meta.frameHeight,
      });
    }
    // Enemy sheets
    for (const name in m.enemies) {
      const meta = m.enemies[name];
      this.load.spritesheet(`enemy-${name}`, `assets/enemies/${name}.png`, {
        frameWidth: meta.frameWidth,
        frameHeight: meta.frameHeight,
      });
    }
    // Tiles
    for (const fname in m.tiles) {
      const key = fname.replace(/\.png$/, '');
      this.load.image(`tile-${key}`, `assets/tiles/${fname}`);
    }
    // Pickups
    for (const fname in m.pickups) {
      const key = fname.replace(/\.png$/, '');
      this.load.image(`pickup-${key}`, `assets/pickups/${fname}`);
    }
  }

  create() {
    // If filecomplete fired late (manifest wasn't ready), still load secondary
    // assets now. Phaser's load.start will re-enter preload cleanly.
    if (!this._manifest && this.cache.json.has('asset-manifest')) {
      this._manifest = this.cache.json.get('asset-manifest');
      this._queueAssetsFromManifest(this._manifest);
      this.load.start();
      // Listen for completion to proceed.
      this.load.once('complete', () => this._buildAnimationsAndStart());
      return;
    }
    this._buildAnimationsAndStart();
  }

  _buildAnimationsAndStart() {
    const m = this._manifest || this.cache.json.get('asset-manifest');
    if (!m) {
      console.error('PreloadScene: asset manifest missing');
      return;
    }

    // ---- Hero animations (from master spritesheet) ----
    // All hero animations use frames from the single 'hero-master' texture.
    // This avoids the Phaser setTexture crash that occurs when switching
    // between animations that use different source textures.
    const master = m.hero_master;
    if (master && this.textures.exists('hero-master')) {
      for (const def of HERO_ANIMATIONS) {
        // def.key is like 'hero-idle'. The state name is 'idle' (strip 'hero-').
        const stateName = def.key.replace('hero-', '');
        // Map 'crouch-hit' state name (file is hero-crouch-hit, key is hero-crouch-hit)
        const stateKey = stateName === 'crouch-hit' ? 'crouch-hit' : stateName;
        const stateMeta = master.states[stateKey];
        if (!stateMeta) continue;
        this.anims.create({
          key: def.key,
          frames: this.anims.generateFrameNumbers('hero-master', {
            start: stateMeta.start,
            end: stateMeta.start + stateMeta.count - 1,
          }),
          frameRate: def.frameRate,
          repeat: def.repeat,
        });
      }
    }

    // ---- Enemy animations ----
    for (const name in ENEMY_ANIMATIONS) {
      const def = ENEMY_ANIMATIONS[name];
      const sheetKey = def.sheetKey;
      if (!this.textures.exists(sheetKey)) continue;
      const count = m.enemies[name].count;
      this.anims.create({
        key: def.key,
        frames: this.anims.generateFrameNumbers(sheetKey, { start: 0, end: count - 1 }),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
    }

    // ---- Pickup semantic mapping ----
    // Assign pickup sprites to roles based on size heuristics.
    // pickup keys are pickup-00..pickup-NN (sorted by slice index).
    const pickupKeys = Object.keys(m.pickups)
      .map((f) => f.replace(/\.png$/, ''))
      .sort();
    // Find largest sprite (likely a coin or star), smallest (likely dust), etc.
    // We'll map a handful of roles and fall back to first sprite for unknowns.
    const pickupsByArea = pickupKeys
      .map((k) => ({ k, area: m.pickups[k + '.png'].size[0] * m.pickups[k + '.png'].size[1] }))
      .sort((a, b) => b.area - a.area);

    this.registry.set('pickupMap', {
      coin:          `pickup-${pickupsByArea[0]?.k.split('-')[1] || '00'}`,
      shadowEnergy:  `pickup-${pickupsByArea[Math.min(3, pickupsByArea.length - 1)]?.k.split('-')[1] || '03'}`,
      powerSpeed:    `pickup-${pickupsByArea[Math.min(6, pickupsByArea.length - 1)]?.k.split('-')[1] || '06'}`,
      powerDoubleJump: `pickup-${pickupsByArea[Math.min(9, pickupsByArea.length - 1)]?.k.split('-')[1] || '09'}`,
      powerShield:   `pickup-${pickupsByArea[Math.min(12, pickupsByArea.length - 1)]?.k.split('-')[1] || '12'}`,
      powerMagnet:   `pickup-${pickupsByArea[Math.min(15, pickupsByArea.length - 1)]?.k.split('-')[1] || '15'}`,
      powerShadowMode: `pickup-${pickupsByArea[Math.min(18, pickupsByArea.length - 1)]?.k.split('-')[1] || '18'}`,
      shadowFragment: `pickup-${pickupsByArea[Math.min(21, pickupsByArea.length - 1)]?.k.split('-')[1] || '21'}`,
      dust:          `pickup-${pickupsByArea[pickupsByArea.length - 1]?.k.split('-')[1] || '00'}`,
    });

    this.scene.start(SCENES.MAIN_MENU);
  }
}
