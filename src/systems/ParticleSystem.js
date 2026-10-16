// src/systems/ParticleSystem.js
// Lightweight particle helpers using Phaser's built-in particle emitters.
// Emitters are created on demand and auto-cleanup when their lifespan ends,
// keeping the per-frame object count low.

import Phaser from 'phaser';
import { COLORS } from '../config/constants.js';

export default class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    // Small white square texture for particles, generated once.
    if (!scene.textures.exists('particle-pixel')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('particle-pixel', 4, 4);
      g.destroy();
    }
  }

  _emit(config) {
    const e = this.scene.add.particles(0, 0, 'particle-pixel', config);
    e.setDepth(8000);
    return e;
  }

  runningDust(x, y, facing = 1) {
    this._emit({
      x, y,
      speed: { min: 20, max: 80 },
      angle: { min: 150, max: 210 },
      gravityY: 200,
      lifespan: 350,
      quantity: 1,
      scale: { start: 1.0, end: 0.2 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xb8a890, 0xa8a0a0],
      emitting: true,
      duration: 60,
    });
  }

  landingDust(x, y) {
    this._emit({
      x, y,
      speed: { min: 80, max: 180 },
      angle: { min: 200, max: 340 },
      gravityY: 300,
      lifespan: 400,
      quantity: 6,
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      tint: [0xb8a890, 0x8a8a90],
      duration: 80,
    });
  }

  coinSparkle(x, y) {
    this._emit({
      x, y,
      speed: { min: 60, max: 180 },
      gravityY: -60,
      lifespan: 500,
      quantity: 8,
      scale: { start: 1.0, end: 0.0 },
      alpha: { start: 1, end: 0 },
      tint: [COLORS.coin, 0xffe9a8],
      duration: 80,
    });
  }

  enemyDefeat(x, y) {
    this._emit({
      x, y,
      speed: { min: 80, max: 220 },
      lifespan: 600,
      quantity: 14,
      scale: { start: 1.4, end: 0.0 },
      alpha: { start: 0.9, end: 0 },
      tint: [COLORS.shadow, COLORS.shadowBright, 0xff8080],
      duration: 100,
    });
  }

  checkpointPulse(x, y) {
    this._emit({
      x, y,
      speed: { min: 40, max: 120 },
      lifespan: 700,
      quantity: 18,
      scale: { start: 1.6, end: 0.0 },
      alpha: { start: 0.9, end: 0 },
      tint: [COLORS.shadowBright, 0xffffff],
      duration: 120,
    });
  }

  dashTrail(x, y, flipX) {
    this._emit({
      x, y,
      speed: { min: 20, max: 60 },
      angle: { min: flipX ? 350 : 170, max: flipX ? 10 : 190 },
      lifespan: 320,
      quantity: 2,
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      tint: [COLORS.shadow, COLORS.shadowBright],
      duration: 50,
    });
  }

  damageBurst(x, y) {
    this._emit({
      x, y,
      speed: { min: 100, max: 240 },
      lifespan: 500,
      quantity: 16,
      scale: { start: 1.4, end: 0.0 },
      alpha: { start: 0.9, end: 0 },
      tint: [COLORS.hazard, 0xffaaaa],
      duration: 80,
    });
  }

  factorySparks(x, y) {
    this._emit({
      x, y,
      speed: { min: 60, max: 200 },
      gravityY: 600,
      lifespan: 500,
      quantity: 4,
      scale: { start: 0.8, end: 0.0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xffd166, 0xff8060],
      duration: 200,
    });
  }

  bossEnergy(x, y) {
    this._emit({
      x, y,
      speed: { min: 40, max: 120 },
      lifespan: 600,
      quantity: 8,
      scale: { start: 1.6, end: 0.0 },
      alpha: { start: 0.8, end: 0 },
      tint: [COLORS.shadow, 0xff66aa, 0xffffff],
      duration: 200,
    });
  }

  victory(x, y) {
    this._emit({
      x, y,
      speed: { min: 120, max: 320 },
      gravityY: 120,
      lifespan: 1200,
      quantity: 30,
      scale: { start: 1.6, end: 0.0 },
      alpha: { start: 1, end: 0 },
      tint: [COLORS.coin, COLORS.shadowBright, 0xffffff, COLORS.good],
      duration: 200,
    });
  }

  // Ambient atmospheric particle (dust / ash / leaves / fog)
  ambient(opts = {}) {
    const defaults = {
      x: { min: 0, max: this.scene.scale.width },
      y: { min: 0, max: this.scene.scale.height },
      speed: { min: 10, max: 40 },
      angle: { min: 70, max: 110 },
      gravityY: -10,
      lifespan: { min: 2000, max: 4000 },
      quantity: 1,
      frequency: 600,
      scale: { start: 0.6, end: 0.0 },
      alpha: { start: 0.4, end: 0 },
      tint: 0xffffff,
      followCamera: true,
    };
    const cfg = { ...defaults, ...opts };
    const e = this.scene.add.particles(0, 0, 'particle-pixel', cfg);
    e.setDepth(7000);
    if (cfg.followCamera) e.setScrollFactor(0.2);
    return e;
  }
}
