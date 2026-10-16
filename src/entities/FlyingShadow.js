// src/entities/FlyingShadow.js
// Aerial patrol. Floats along a sinusoidal path between two x bounds,
// occasionally swooping toward the player when in range. Readable motion.

import Enemy from './Enemy.js';
import { COLORS } from '../config/constants.js';

export default class FlyingShadow extends Enemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, 'enemy-flying-shadow', 'flying-fly');
    this.body.setSize(180, 140);
    this.body.setOffset((this.width - 180) / 2, (this.height - 140) / 2);
    this.body.setAllowGravity(false);
    this.speed = 80;
    this.maxHealth = 1;
    this.health = 1;
    this.stompable = true;
    this.originX = x;
    this.originY = y;
    this.patrolRange = opts.range || 220;
    this.phase = opts.phase || 0;
    this.amp = opts.amp || 30;
    this.swoopCooldownUntil = 0;
    this.swoopUntil = 0;
    this.swoopDir = 0;
  }

  update(time, delta) {
    if (this.isDead || !this.active) return;
    if (this.scene.combat && this.scene.combat.isFrozen()) return;
    const dt = delta / 1000;
    const t = time / 1000 + this.phase;

    // Check if player is near and swoop
    const player = this.scene.player;
    if (player && time > this.swoopCooldownUntil && time > this.swoopUntil) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 320 && Math.abs(dx) < 260) {
        this.swoopDir = Math.sign(dx) || 1;
        this.swoopUntil = time + 600;
        this.swoopCooldownUntil = time + 1800;
      }
    }
    if (time < this.swoopUntil) {
      this.x += this.swoopDir * 220 * dt;
      this.y += 80 * dt;
      this.setFlipX(this.swoopDir < 0);
      return;
    }
    // Patrol: side-to-side with sine bob
    const desiredX = this.originX + Math.sin(t * 0.8) * this.patrolRange;
    const desiredY = this.originY + Math.sin(t * 1.6) * this.amp;
    this.x += (desiredX - this.x) * 0.05;
    this.y += (desiredY - this.y) * 0.05;
    const vxSign = Math.cos(t * 0.8);
    if (Math.abs(vxSign) > 0.3) this.setFlipX(vxSign < 0);
  }
}
