// src/entities/FinalBoss.js
// THE FINAL SHADOW — three-phase boss fight.
// Phase 1: walks + projectile bursts
// Phase 2: faster, adds teleport + arena hazard pulses
// Phase 3: darkened arena, shadow dashes, multi-projectile combos
// Boss has a health bar (drawn by HUD when fight active), intro sequence,
// phase transitions, telegraphs, and a death animation.
//
// Player damages the boss by dashing into it (Shadow Dash) — this is the
// signature interaction tying the dash mechanic to the final encounter.

import Phaser from 'phaser';
import { COLORS } from '../config/constants.js';
import AudioSystem from '../systems/AudioSystem.js';

const PHASE = { INTRO: 0, ONE: 1, TWO: 2, THREE: 3, DEFEATED: 4 };

export default class FinalBoss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy-shadow-hunter');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1.0);
    this.setDepth(60);
    this.body.setAllowGravity(true);
    this.body.setSize(220, 200);
    this.body.setOffset((this.width - 220) / 2, this.height - 200);
    this.body.setCollideWorldBounds(true);
    this.setScale(1.6);

    this.maxHealth = 12;
    this.health = 12;
    this.phase = PHASE.INTRO;
    this.facing = -1;
    this.invulnUntil = 0;
    this.actionUntil = 0;
    this.nextActionAt = 0;
    this.projectiles = scene.physics.add.group();
    this.isDead = false;
    this.introStarted = false;
    this.stompable = false;
    this.damage = 1;
    this.scene.events.on('update', this.update, this);
    this.scene.events.once('shutdown', () => this.scene.events.off('update', this.update, this));
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.scene && this.scene.events) {
        this.scene.events.off('update', this.update, this);
      }
    });
  }

  startIntro() {
    if (this.introStarted) return;
    this.introStarted = true;
    this.scene.time.delayedCall(400, () => {
      if (this.scene.hud) this.scene.hud.showBossBar('THE FINAL SHADOW');
      AudioSystem.play('bossPhase');
    });
    this.scene.time.delayedCall(1800, () => {
      this.phase = PHASE.ONE;
      this.nextActionAt = this.scene.time.now + 400;
      this.anims.play('hunter-walk', true);
    });
  }

  update(time, delta) {
    if (this.isDead) return;
    if (this.scene.combat && this.scene.combat.isFrozen()) return;
    if (this.phase === PHASE.INTRO || this.phase === PHASE.DEFEATED) return;
    if (!this.scene.player) return;
    if (time < this.actionUntil) {
      // mid-action — keep current velocity
      return;
    }
    if (time < this.nextActionAt) return;
    // Pick next action based on phase
    const player = this.scene.player;
    const dx = player.x - this.x;
    this.facing = Math.sign(dx) || 1;
    this.setFlipX(this.facing < 0);

    const actions = this.phase === PHASE.ONE
      ? ['shoot', 'walk', 'shoot']
      : this.phase === PHASE.TWO
      ? ['shoot', 'teleport', 'walk', 'shoot', 'shoot']
      : ['dashAttack', 'shootBurst', 'teleport', 'shootBurst'];

    const action = actions[Math.floor(Math.random() * actions.length)];
    this._doAction(action, time);
  }

  _doAction(action, time) {
    const player = this.scene.player;
    switch (action) {
      case 'walk':
        this.body.setVelocityX(this.facing * 90);
        this.actionUntil = time + 800;
        this.nextActionAt = time + 850;
        break;
      case 'shoot':
        this.body.setVelocityX(0);
        this._spawnProjectile(player.x, player.y);
        AudioSystem.play('bossHit');
        this.actionUntil = time + 200;
        this.nextActionAt = time + 600;
        break;
      case 'shootBurst':
        this.body.setVelocityX(0);
        for (let i = -2; i <= 2; i++) {
          this._spawnProjectile(player.x + i * 80, player.y + 20, i);
        }
        AudioSystem.play('bossPhase');
        this.actionUntil = time + 300;
        this.nextActionAt = time + 900;
        break;
      case 'teleport':
        this.body.setVelocityX(0);
        this._teleport(player.x + (Math.random() > 0.5 ? 260 : -260));
        AudioSystem.play('dash');
        this.actionUntil = time + 350;
        this.nextActionAt = time + 700;
        break;
      case 'dashAttack':
        this.body.setVelocityX(this.facing * 460);
        this.setTint(COLORS.hazard);
        this.actionUntil = time + 500;
        this.nextActionAt = time + 900;
        this.scene.time.delayedCall(500, () => this.clearTint());
        break;
    }
  }

  _spawnProjectile(tx, ty, spread = 0) {
    const p = this.scene.add.image(this.x, this.y - 100, 'pickup-00')
      .setTint(COLORS.shadow)
      .setDepth(55)
      .setScale(0.6);
    this.scene.physics.add.existing(p);
    const dx = tx - this.x, dy = ty - (this.y - 100);
    const d = Math.hypot(dx, dy) || 1;
    const speed = 260;
    p.body.setAllowGravity(false);
    p.body.setVelocity((dx / d) * speed + spread * 60, (dy / d) * speed);
    p.update = () => {};
    p.setData('type', 'bossProjectile');
    p.setData('damage', 1);
    this.projectiles.add(p);
    this.scene.tweens.add({ targets: p, angle: 360, duration: 800, repeat: -1 });
    // Auto-cull
    this.scene.time.delayedCall(3000, () => { if (p.active) p.destroy(); });
  }

  _teleport(targetX) {
    // Fade out at old position, fade in at new
    const old = this.scene.add.sprite(this.x, this.y, this.texture.key, 0)
      .setOrigin(0.5, 1.0).setScale(1.6).setTint(COLORS.shadowBright).setAlpha(0.8).setDepth(59);
    this.scene.tweens.add({ targets: old, alpha: 0, duration: 250, onComplete: () => old.destroy() });
    const bounds = this.scene.physics.world.bounds;
    targetX = Phaser.Math.Clamp(targetX, bounds.x + 100, bounds.x + bounds.width - 100);
    this.x = targetX;
    if (this.scene.particles) this.scene.particles.bossEnergy(this.x, this.y - 100);
  }

  // Player dash deals damage. Called from GameScene when player overlaps boss while dashing.
  takeDashHit() {
    if (this.isDead) return;
    const now = this.scene.time.now;
    if (now < this.invulnUntil) return;
    this.health -= 1;
    this.invulnUntil = now + 700;
    AudioSystem.play('bossHit');
    if (this.scene.particles) this.scene.particles.bossEnergy(this.x, this.y - 100);
    if (this.scene.camera) this.scene.camera.bossHit();
    if (this.scene.hud) this.scene.hud.setBossHealth(this.health / this.maxHealth);
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => this.clearTint());

    if (this.health <= 8 && this.phase === PHASE.ONE) this._enterPhase(PHASE.TWO);
    else if (this.health <= 4 && this.phase === PHASE.TWO) this._enterPhase(PHASE.THREE);
    else if (this.health <= 0) this._defeat();
  }

  _enterPhase(p) {
    this.phase = p;
    AudioSystem.play('bossPhase');
    if (this.scene.camera) this.scene.camera.impulseShake(8, 300);
    if (this.scene.hud) {
      this.scene.hud.showToast(p === PHASE.TWO ? 'PHASE 2' : 'PHASE 3');
    }
    if (p === PHASE.THREE) {
      // Darken the arena
      this.scene.cameras.main.flash(300, 30, 0, 50);
    }
  }

  _defeat() {
    this.isDead = true;
    this.phase = PHASE.DEFEATED;
    AudioSystem.play('bossDefeat');
    if (this.scene.camera) this.scene.camera.bossDeath();
    if (this.scene.hud) this.scene.hud.hideBossBar();
    // Death animation: rise, expand, burst
    this.body.setVelocity(0, -120);
    this.body.setAllowGravity(false);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 2.6,
      scaleY: 2.6,
      angle: 30,
      duration: 1400,
      ease: 'Quad.Out',
      onUpdate: () => {
        if (Math.random() < 0.4 && this.scene.particles)
          this.scene.particles.bossEnergy(this.x + (Math.random() - 0.5) * 200, this.y - 100 - Math.random() * 200);
      },
      onComplete: () => {
        if (this.scene.particles) this.scene.particles.victory(this.x, this.y - 100);
        this.destroy();
        if (this.scene.onBossDefeated) this.scene.onBossDefeated();
      },
    });
  }

  // Touch damage to player from body or projectiles handled by GameScene overlap.
}
