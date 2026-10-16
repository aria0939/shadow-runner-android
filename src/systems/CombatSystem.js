// src/systems/CombatSystem.js
// Resolves stomp vs side-contact between player and enemies. Applies damage,
// hit-stop, knockback, invulnerability, and visual feedback.

import Phaser from 'phaser';
import { PHYSICS, COLORS } from '../config/constants.js';
import AudioSystem from './AudioSystem.js';

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.hitStopUntil = 0;
  }

  // Returns true if game time is currently inside a hit-stop window.
  isFrozen() { return this.scene.time.now < this.hitStopUntil; }

  freezeFor(ms) {
    this.hitStopUntil = Math.max(this.hitStopUntil, this.scene.time.now + ms);
  }

  // Called when player overlaps an enemy.
  handlePlayerEnemy(player, enemy) {
    if (!player || !enemy || !player.active || !enemy.active) return;
    if (player.invulnUntil > this.scene.time.now) return;
    if (enemy.isDead) return;

    // Determine if this is a stomp: player is falling, near top of enemy,
    // and player's previous velocity was downward.
    const pBottom = player.body.y + player.body.height;
    const eTop = enemy.body.y;
    const falling = player.body.velocity.y > 60;
    const above = pBottom <= eTop + 24;

    if (falling && above && enemy.stompable !== false) {
      this._stomp(player, enemy);
    } else {
      this._damage(player, enemy);
    }
  }

  _stomp(player, enemy) {
    // Damage or kill enemy
    if (typeof enemy.takeDamage === 'function') {
      enemy.takeDamage(1, { fromAbove: true });
    } else {
      enemy.damage?.(1);
    }
    // Bounce
    player.setVelocityY(PHYSICS.stompBounce);
    this.freezeFor(PHYSICS.hitStopSmall);
    AudioSystem.play('enemyDefeat');
    if (this.scene.particles) this.scene.particles.enemyDefeat(enemy.x, enemy.y - enemy.body.height / 2);
    if (this.scene.camera) this.scene.camera.impulseShake(3, 100);
  }

  _damage(player, enemy) {
    if (player.takeDamage) {
      player.takeDamage(1, { sourceX: enemy.x });
    }
  }
}
