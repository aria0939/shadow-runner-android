// src/entities/ShadowHunter.js
// Aggressive enemy. Patrols idly; when player comes into notice range,
// rushes toward player, attacks (touch damage), pauses, then resumes.

import Enemy from './Enemy.js';
import { COLORS } from '../config/constants.js';
import AudioSystem from '../systems/AudioSystem.js';

const STATES = { IDLE: 'IDLE', CHASE: 'CHASE', ATTACK: 'ATTACK', PAUSE: 'PAUSE' };

export default class ShadowHunter extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy-shadow-hunter', 'hunter-walk');
    this.body.setSize(200, 160);
    this.body.setOffset((this.width - 200) / 2, this.height - 160);
    this.speed = 70;
    this.chaseSpeed = 180;
    this.maxHealth = 2;
    this.health = 2;
    this.aiState = STATES.IDLE;
    this.stateUntil = 0;
    this.noticeRange = 360;
    this.attackRange = 80;
    this.stompable = true;
  }

  update(time, delta) {
    if (this.isDead || !this.active) return;
    if (this.scene.combat && this.scene.combat.isFrozen()) return;
    const player = this.scene.player;
    if (!player || player.dead) {
      super.update(time, delta);
      return;
    }
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.hypot(dx, dy);

    switch (this.aiState) {
      case STATES.IDLE:
        super.update(time, delta);
        if (d < this.noticeRange && Math.abs(dy) < 80) {
          this.aiState = STATES.CHASE;
          this.stateUntil = time + 2500;
          this.setTint(COLORS.hazard);
        }
        break;
      case STATES.CHASE:
        this.facing = Math.sign(dx) || this.facing;
        this.body.setVelocityX(this.facing * this.chaseSpeed);
        this.setFlipX(this.facing < 0);
        if (d < this.attackRange) {
          this.aiState = STATES.ATTACK;
          this.stateUntil = time + 300;
          this.body.setVelocityX(0);
        } else if (time > this.stateUntil || d > this.noticeRange * 1.5) {
          this.aiState = STATES.PAUSE;
          this.stateUntil = time + 800;
          this.body.setVelocityX(0);
          this.clearTint();
        }
        break;
      case STATES.ATTACK:
        // Touch damages player via CombatSystem overlap
        if (time > this.stateUntil) {
          this.aiState = STATES.PAUSE;
          this.stateUntil = time + 600;
        }
        break;
      case STATES.PAUSE:
        this.body.setVelocityX(0);
        if (time > this.stateUntil) {
          this.aiState = STATES.IDLE;
          this.clearTint();
        }
        break;
    }
  }
}
