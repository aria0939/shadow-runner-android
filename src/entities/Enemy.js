// src/entities/Enemy.js
// Base enemy class. Provides takeDamage(), stomp handling, and a simple
// patrol AI. Subclasses override update() for custom behaviour.

import Phaser from 'phaser';
import { COLORS } from '../config/constants.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, animKey) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1.0);
    this.setDepth(50);
    this.body.setAllowGravity(true);
    this.body.setCollideWorldBounds(false);
    this.animKey = animKey;
    if (animKey && scene.anims.exists(animKey)) this.anims.play(animKey, true);
    this.isDead = false;
    this.maxHealth = 1;
    this.health = 1;
    this.damage = 1;
    this.stompable = true;
    this.speed = 60;
    this.facing = -1;
    this.ledgeDetector = null;
    this.scene.events.on('update', this.update, this);
    this.scene.events.once('shutdown', () => this.scene.events.off('update', this.update, this));
  }

  // Override in subclasses
  update(time, delta) {
    if (this.isDead || !this.active) return;
    if (this.scene.combat && this.scene.combat.isFrozen()) return;
    // Default: walk back and forth, turn at walls
    this.body.setVelocityX(this.facing * this.speed);
    this.setFlipX(this.facing < 0);
    // Wall turn
    if (this.body.blocked.left)  this.facing = 1;
    if (this.body.blocked.right) this.facing = -1;
    // Ledge detection (optional)
    if (this.ledgeDetect) {
      const ahead = this.x + this.facing * (this.body.width / 2 + 6);
      const footY = this.y + 4;
      const tiles = this.scene.solids?.getTilesWithinWorldXY(ahead - 4, footY, 8, 6);
      if (tiles && tiles.length === 0) this.facing *= -1;
    }
  }

  takeDamage(amount, opts = {}) {
    if (this.isDead) return;
    this.health -= amount;
    if (this.health <= 0) this.die();
    else {
      // Brief defensive reaction
      this.setTint(0xffffff);
      this.scene.time.delayedCall(80, () => this.clearTint());
    }
  }

  die() {
    this.isDead = true;
    this.body.setVelocity(0, -200);
    this.body.setAllowGravity(true);
    this.setTint(0x666666);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: this.facing * 90,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }
}
