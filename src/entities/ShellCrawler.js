// src/entities/ShellCrawler.js
// Slower, tougher enemy. 2 HP. When stomped once, retreats into shell for
// ~1.5s (invulnerable + stationary), then resumes. Second stomp defeats it.

import Enemy from './Enemy.js';
import { COLORS } from '../config/constants.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class ShellCrawler extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy-shell-crawler', 'shell-walk');
    this.body.setSize(160, 140);
    this.body.setOffset((this.width - 160) / 2, this.height - 140);
    this.speed = 40;
    this.maxHealth = 2;
    this.health = 2;
    this.inShellUntil = 0;
    this.ledgeDetect = true;
  }

  update(time, delta) {
    if (this.isDead || !this.active) return;
    if (this.scene.combat && this.scene.combat.isFrozen()) return;
    if (time < this.inShellUntil) {
      // Hiding in shell — no movement, invulnerable
      this.body.setVelocityX(0);
      this.setTint(COLORS.shadowDeep);
      return;
    }
    this.clearTint();
    super.update(time, delta);
  }

  takeDamage(amount, opts = {}) {
    if (this.isDead) return;
    if (this.scene.time.now < this.inShellUntil) return;
    if (this.health === 2) {
      // First hit: retreat into shell
      this.health = 1;
      this.inShellUntil = this.scene.time.now + 1500;
      this.body.setVelocityX(0);
      AudioSystem.play('enemyDefeat');
      this.setTint(COLORS.shadowDeep);
      return;
    }
    // Second hit kills
    super.takeDamage(amount, opts);
  }
}
