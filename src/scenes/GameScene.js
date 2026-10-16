// src/scenes/GameScene.js
// The main gameplay scene. Loads a level, builds terrain, spawns enemies and
// collectibles, wires player input, runs combat, manages checkpoints and
// level completion. Hosts the HUD, touch controls, particles, camera, audio.

import Phaser from 'phaser';
import { SCENES, COLORS, PHYSICS, LEVELS, GAME, DEBUG } from '../config/constants.js';
import InputSystem from '../systems/InputSystem.js';
import TouchControls from '../systems/TouchControls.js';
import CameraSystem from '../systems/CameraSystem.js';
import ParticleSystem from '../systems/ParticleSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import HUD from '../ui/HUD.js';
import DialogBox from '../ui/DialogBox.js';
import Player from '../entities/Player.js';
import Walker from '../entities/Walker.js';
import ShellCrawler from '../entities/ShellCrawler.js';
import FlyingShadow from '../entities/FlyingShadow.js';
import ShadowHunter from '../entities/ShadowHunter.js';
import FinalBoss from '../entities/FinalBoss.js';

import LEVELS_DATA from '../levels/index.js';

const TILE = 64; // logical tile size used by the level layout grid

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  init(data) {
    this.levelId = data?.levelId || 1;
    this.fromCheckpoint = data?.fromCheckpoint || false;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    AudioSystem.init();
    this.cameras.main.setBackgroundColor('#05060a');
    this.cameras.main.setRoundPixels(true);

    // ---- Load level data ----
    const levelDef = LEVELS.find((l) => l.id === this.levelId);
    if (!levelDef) {
      console.error('Unknown level', this.levelId);
      this.scene.start(SCENES.MAIN_MENU);
      return;
    }
    const data = LEVELS_DATA[this.levelId];
    this.levelDef = levelDef;
    this.levelData = data;

    // ---- Build parallax background ----
    this._buildBackground(data);

    // ---- Build world ----
    // Solids group: physics tiles that collide with player + enemies.
    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.checkpoints = this.physics.add.staticGroup();
    this.exits = this.physics.add.staticGroup();
    this.secretBlocks = this.physics.add.staticGroup();  // breakable by dash
    this.decor = this.add.group();                        // non-interactive

    this._buildLevel(data);

    // ---- Player ----
    const spawn = this._spawnPoint();
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.setInputSystem(new InputSystem(this));

    // ---- Enemies ----
    this.enemies = this.physics.add.group();
    this._spawnEnemies(data);

    // ---- Boss ----
    this.boss = null;
    if (this.levelId === 5) {
      this.boss = new FinalBoss(this, data.boss.x, data.boss.y);
      this.bossStartX = data.boss.x;
      this.bossTriggerX = data.bossTriggerX;
    }

    // ---- Systems ----
    this.particles = new ParticleSystem(this);
    this.combat = new CombatSystem(this);
    this.camera = new CameraSystem(this, this.player);
    const worldW = data.width * TILE;
    const worldH = Math.max(data.height * TILE, H + 200);
    this.camera.setBounds(0, 0, worldW, worldH);
    this.camera.snap(this.player.x, this.player.y);

    // ---- HUD ----
    this.hud = new HUD(this);
    this.hud.setHealth(this.player.health);
    this.hud.setCoins(SaveSystem.get().totalCoins);
    this.hud.setScore(SaveSystem.get().totalScore);
    this.hud.setLevelName(levelDef.name.toUpperCase());
    this.hud.setShadowEnergy(this.player.shadowEnergy / PHYSICS.shadowEnergyMax);
    this.dialog = new DialogBox(this);

    // ---- Touch controls ----
    this.touch = new TouchControls(this, this.player.input);

    // ---- Score / coin counters ----
    this.sessionScore = 0;
    this.sessionCoins = 0;
    this.sessionFragments = 0;
    this.startTime = this.time.now;

    // ---- Physics collisions ----
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.secretBlocks, this._onPlayerHitSecretBlock, null, this);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.enemies, this.secretBlocks);
    if (this.boss) this.physics.add.collider(this.boss, this.solids);

    // Hazards
    this.physics.add.overlap(this.player, this.hazards, () => {
      this.player.takeDamage(1, { sourceX: this.player.x });
    });

    // Collectibles
    this.physics.add.overlap(this.player, this.collectibles, this._onCollect, null, this);

    // Checkpoints
    this.physics.add.overlap(this.player, this.checkpoints, this._onCheckpoint, null, this);

    // Exit
    this.physics.add.overlap(this.player, this.exits, this._onExit, null, this);

    // Combat: player vs enemies
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this.combat.handlePlayerEnemy(p, e));

    // Combat: player dash vs boss
    if (this.boss) {
      this.physics.add.overlap(this.player, this.boss, (p, b) => {
        if (this.time.now < this.player.dashUntil) {
          b.takeDashHit();
        } else if (this.time.now > this.player.invulnUntil) {
          this.player.takeDamage(1, { sourceX: b.x });
        }
      });
      // Boss projectiles vs player
      this.physics.add.overlap(this.player, this.boss.projectiles, (p, proj) => {
        if (!proj.active) return;
        proj.destroy();
        this.player.takeDamage(1, { sourceX: proj.x });
      });
    }

    // ---- Music ----
    AudioSystem.playMusic(`level${String(this.levelId).padStart(2, '0')}`);

    // ---- Ambient particles ----
    this._spawnAmbient(data);

    // ---- Pause / restart hotkeys handled in InputSystem ----
    this.events.on('update', this._lateUpdate, this);
    this.events.once('shutdown', () => this._cleanup());
    this.events.once('pause', () => AudioSystem.stopMusic());
    this.events.once('resume', () => AudioSystem.playMusic(`level${String(this.levelId).padStart(2, '0')}`));

    // ---- Boss trigger ----
    if (this.boss) {
      this.bossTriggered = false;
    }

    // ---- Intro hint ----
    if (this.levelId === 1 && !this.fromCheckpoint) {
      this.time.delayedCall(800, () => {
        this.dialog.show('Move with the arrows. Jump on enemies. Press DASH to phase through shadow blocks.', 4500);
      });
    }
  }

  // ---------------------------------------------------------- background
  _buildBackground(data) {
    const W = this.scale.width, H = this.scale.height;
    const worldW = data.width * TILE;
    // Use supplied green valley background for level 1; tint for other levels.
    const baseKey = 'bg-green-valley';
    if (!this.textures.exists(baseKey)) return;
    // Far background layer (slow parallax)
    this.bgFar = this.add.tileSprite(0, 0, W, H, baseKey)
      .setOrigin(0, 0).setDepth(-100).setScrollFactor(0).setAlpha(0.55);
    // Color tint per level mood
    const tints = {
      1: 0xffffff, 2: 0x6a4cff, 3: 0xaaccff, 4: 0xff8866, 5: 0xff3366,
    };
    if (tints[this.levelId]) this.bgFar.setTint(tints[this.levelId]);

    // Near silhouette layer: dark gradient drawn as rectangles
    const g = this.add.graphics().setDepth(-90).setScrollFactor(0.2);
    g.fillStyle(0x05060a, 0.6);
    g.fillRect(0, H - 200, W, 200);
    // Distant silhouettes (a few triangles / rectangles)
    g.fillStyle(0x111122, 0.9);
    for (let i = 0; i < 6; i++) {
      const x = (i / 6) * W;
      const peakH = 60 + (i % 3) * 40;
      g.beginPath();
      g.moveTo(x, H - 100);
      g.lineTo(x + 60, H - 100 - peakH);
      g.lineTo(x + 120, H - 100);
      g.closePath();
      g.fillPath();
    }
  }

  // ---------------------------------------------------------- level build
  _buildLevel(data) {
    const layout = data.layout;
    // Layout is an array of strings; each char is a tile code.
    // Build solids + decor by walking the grid.
    const scale = TILE / 64; // tiles in the assets are roughly 64 logical units
    for (let r = 0; r < layout.length; r++) {
      const row = layout[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        if (ch === '#') {
          // Solid ground tile
          const tile = this.solids.create(x, y, 'tile-01');
          tile.setDisplaySize(TILE, TILE).refreshBody();
        } else if (ch === '=') {
          // Platform top (one-way visually same as solid for simplicity)
          const tile = this.solids.create(x, y, 'tile-09');
          tile.setDisplaySize(TILE, TILE).refreshBody();
        } else if (ch === '^') {
          // Spike hazard
          const s = this.add.image(x, y, 'tile-14').setDisplaySize(TILE, TILE).setDepth(40);
          const body = this.hazards.create(x, y + 8, 'particle-pixel').setVisible(false);
          body.body.setSize(TILE - 8, 24);
          body.refreshBody();
        } else if (ch === 'B') {
          // Breakable shadow block (destroyed by dash)
          const b = this.secretBlocks.create(x, y, 'tile-13');
          b.setDisplaySize(TILE, TILE).setTint(COLORS.shadow).refreshBody();
          b.setData('breakable', true);
        } else if (ch === 'C') {
          // Coin
          this._spawnCollectible(x, y, 'coin');
        } else if (ch === 'E') {
          // Shadow Energy
          this._spawnCollectible(x, y, 'shadowEnergy');
        } else if (ch === 'F') {
          // Shadow Fragment (collectible rating)
          this._spawnCollectible(x, y, 'shadowFragment');
        } else if (ch === 'P') {
          // Power-up (cycle: speed, doubleJump, shield, magnet, shadowMode)
          const kinds = ['speed', 'doubleJump', 'shield', 'magnet', 'shadowMode'];
          const k = kinds[(r + c) % kinds.length];
          this._spawnCollectible(x, y, k);
        } else if (ch === 'K') {
          // Checkpoint
          const cp = this.checkpoints.create(x, y, 'tile-07');
          cp.setDisplaySize(TILE, TILE * 2).setTint(COLORS.shadowDeep).refreshBody();
          cp.setData('activated', false);
          cp.setData('x', x);
          cp.setData('y', y + TILE);
        } else if (ch === 'X') {
          // Exit (goal portal)
          const ex = this.exits.create(x, y, 'tile-15');
          ex.setDisplaySize(TILE, TILE * 2).setTint(COLORS.shadowBright).refreshBody();
          ex.setData('x', x);
          ex.setData('y', y);
        } else if (ch === 'D') {
          // Decorative tile
          const dec = this.add.image(x, y, 'tile-16').setDisplaySize(TILE, TILE).setDepth(20);
          this.decor.add(dec);
        }
      }
    }
  }

  _spawnCollectible(x, y, type) {
    const pickupMap = this.registry.get('pickupMap') || {};
    const key = pickupMap[type] || 'pickup-00';
    const sprite = this.add.image(x, y, key).setDepth(45);
    this.physics.add.existing(sprite);
    sprite.body.setAllowGravity(false);
    sprite.body.setCircle(20, sprite.width / 2 - 20, sprite.height / 2 - 20);
    sprite.setData('type', type);
    sprite.setData('value', type === 'coin' ? 100 : 0);
    sprite.setDepth(45);
    // Bob animation
    this.tweens.add({
      targets: sprite,
      y: y - 6,
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.collectibles.add(sprite);
  }

  _spawnEnemies(data) {
    if (!data.enemies) return;
    for (const e of data.enemies) {
      let inst;
      switch (e.type) {
        case 'walker':         inst = new Walker(this, e.x, e.y); break;
        case 'shell-crawler':  inst = new ShellCrawler(this, e.x, e.y); break;
        case 'flying-shadow':  inst = new FlyingShadow(this, e.x, e.y, e.opts || {}); break;
        case 'shadow-hunter':  inst = new ShadowHunter(this, e.x, e.y); break;
        default: continue;
      }
      this.enemies.add(inst);
    }
  }

  _spawnPoint() {
    const data = this.levelData;
    const cp = this.fromCheckpoint ? SaveSystem.getCheckpoint() : null;
    if (cp && cp.levelId === this.levelId) {
      return { x: cp.x, y: cp.y };
    }
    return { x: data.spawn.x, y: data.spawn.y };
  }

  // ---------------------------------------------------------- ambient
  _spawnAmbient(data) {
    const kinds = {
      1: 'dust', 2: 'ash', 3: 'cloud', 4: 'sparks', 5: 'shadow',
    };
    const kind = kinds[this.levelId] || 'dust';
    const tints = {
      dust: 0xb8a890, ash: 0xa8a8b8, cloud: 0xffffff, sparks: 0xffd166, shadow: 0xb5a3ff,
    };
    if (kind === 'sparks') {
      // Occasional factory sparks near top
      this.time.addEvent({
        delay: 600, loop: true,
        callback: () => {
          if (!this.particles) return;
          const x = this.cameras.main.scrollX + Math.random() * this.scale.width;
          const y = this.scale.height * 0.5 + Math.random() * 200;
          this.particles.factorySparks(x, y);
        },
      });
    } else {
      this.particles.ambient({
        x: { min: 0, max: this.scale.width },
        y: { min: 0, max: this.scale.height },
        speed: { min: 5, max: 25 },
        angle: { min: 70, max: 110 },
        gravityY: kind === 'cloud' ? -20 : -5,
        lifespan: { min: 3000, max: 6000 },
        frequency: 800,
        tint: tints[kind],
        alpha: { start: 0.4, end: 0 },
        scale: { start: 0.7, end: 0 },
      });
    }
  }

  // ---------------------------------------------------------- events
  _onPlayerHitSecretBlock(player, block) {
    // If player is dashing, break the block
    if (this.time.now < player.dashUntil && block.getData('breakable')) {
      block.destroy();
      if (this.particles) this.particles.dashTrail(block.x, block.y, player.flipX);
      AudioSystem.play('dash');
    }
  }

  _onCollect(player, item) {
    if (!item || !item.active) return;
    const type = item.getData('type');
    item.destroy();
    switch (type) {
      case 'coin':
        this.sessionCoins += 1;
        this.sessionScore += 100;
        if (this.sessionCoins > 0 && this.sessionCoins % PHYSICS.coinsPerExtraLife === 0) {
          // +1 life — represented as +1 health, capped
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        }
        AudioSystem.play('coin');
        if (this.particles) this.particles.coinSparkle(item.x, item.y);
        this.hud.setCoins(SaveSystem.get().totalCoins + this.sessionCoins);
        this.hud.setScore(SaveSystem.get().totalScore + this.sessionScore);
        this.hud.setHealth(this.player.health);
        break;
      case 'shadowEnergy':
        this.player.addShadowEnergy(PHYSICS.shadowEnergyPickup);
        AudioSystem.play('powerUp');
        if (this.particles) this.particles.checkpointPulse(item.x, item.y);
        break;
      case 'shadowFragment':
        this.sessionFragments += 1;
        AudioSystem.play('levelComplete');
        if (this.particles) this.particles.victory(item.x, item.y);
        if (this.hud) this.hud.showToast('SHADOW FRAGMENT');
        break;
      case 'speed':
      case 'doubleJump':
      case 'shield':
      case 'magnet':
      case 'shadowMode':
        this.player.powerups.activate(type);
        break;
    }
    this.hud.setShadowEnergy(this.player.shadowEnergy / PHYSICS.shadowEnergyMax);
  }

  _onCheckpoint(player, cp) {
    if (cp.getData('activated')) return;
    cp.setData('activated', true);
    cp.clearTint().setTint(COLORS.shadowBright);
    AudioSystem.play('checkpoint');
    if (this.particles) this.particles.checkpointPulse(cp.x, cp.y);
    SaveSystem.setCheckpoint({
      levelId: this.levelId,
      x: cp.getData('x'),
      y: cp.getData('y'),
      score: SaveSystem.get().totalScore + this.sessionScore,
      coins: SaveSystem.get().totalCoins + this.sessionCoins,
      health: this.player.health,
    });
    if (this.hud) this.hud.showToast('CHECKPOINT');
  }

  _onExit(player, exit) {
    if (this.boss && !this.boss.isDead) return; // can't exit until boss defeated
    this._completeLevel();
  }

  handlePlayerDeath() {
    SaveSystem.clearCheckpoint();
    this.scene.restart({ levelId: this.levelId, fromCheckpoint: false });
  }

  _completeLevel() {
    AudioSystem.stopMusic();
    AudioSystem.play('levelComplete');
    const time = this.time.now - this.startTime;
    SaveSystem.markCompleted(this.levelId, {
      fragments: this.sessionFragments,
      time,
      score: SaveSystem.get().totalScore + this.sessionScore,
    });
    // Persist cumulative coins/score
    const s = SaveSystem.get();
    s.totalCoins += this.sessionCoins;
    s.totalScore += this.sessionScore;
    SaveSystem.save();
    SaveSystem.clearCheckpoint();
    this.scene.start(SCENES.LEVEL_COMPLETE, {
      levelId: this.levelId,
      score: this.sessionScore,
      coins: this.sessionCoins,
      fragments: this.sessionFragments,
      time,
    });
  }

  onBossDefeated() {
    if (this.hud) this.hud.showToast('VICTORY');
    this.time.delayedCall(1500, () => this._completeLevel());
  }

  // ---------------------------------------------------------- per-frame
  _lateUpdate(time, delta) {
    if (!this.player) return;
    // HUD sync
    this.hud.setHealth(this.player.health);
    this.hud.setShadowEnergy(this.player.shadowEnergy / PHYSICS.shadowEnergyMax);
    // Active powerup timers
    const kinds = ['speed', 'doubleJump', 'shield', 'magnet', 'shadowMode'];
    for (const k of kinds) {
      const r = this.player.powerups.remaining(k);
      this.hud.setPowerup(k.toUpperCase(), r);
    }
    // Camera follow
    this.camera.update(delta);
    // Background parallax
    if (this.bgFar) {
      this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.15;
      this.bgFar.tilePositionY = this.cameras.main.scrollY * 0.05;
    }
    // Pause hotkey
    if (this.player.input.pauseJustPressed(time)) {
      this.scene.pause();
      this.scene.launch(SCENES.PAUSE);
    }
    // Restart hotkey
    if (this.player.input.restartJustPressed(time)) {
      SaveSystem.clearCheckpoint();
      this.scene.restart({ levelId: this.levelId, fromCheckpoint: false });
    }
    // Boss trigger
    if (this.boss && !this.bossTriggered && this.player.x > this.bossTriggerX) {
      this.bossTriggered = true;
      // Lock the arena behind player
      const wallX = this.bossTriggerX - 40;
      const groundY = this.levelData.boss.y + 200;
      this.arenaWall = this.solids.create(wallX, groundY - 200, 'tile-01')
        .setVisible(false).refreshBody();
      this.boss.startIntro();
    }
    // Echo trigger on dash key double-tap (signature mechanic)
    // Simpler: triggered by pressing the boss bar area when low energy.
    // Skip auto-trigger to avoid overuse per design doc.
  }

  _cleanup() {
    AudioSystem.stopMusic();
    if (this.touch) this.touch.destroy();
    this.touch = null;
  }
}
