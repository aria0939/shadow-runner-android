// src/entities/Player.js
// The hero. Implements a responsive platformer controller with:
//   - acceleration / deceleration / air control
//   - coyote time + jump buffer
//   - variable jump height
//   - turn-around boost
//   - terminal velocity
//   - Shadow Dash with cooldown, energy cost, and afterimage trail
//   - animation state machine with flicker-free transitions
//   - health, invulnerability, knockback, death
//   - Shadow Echo recorder (records last 2.5s of position for replay)

import Phaser from 'phaser';
import { PHYSICS, PLAYER_BODY, COLORS, DEBUG } from '../config/constants.js';
import { heroAnimKey } from '../config/animations.js';
import AudioSystem from '../systems/AudioSystem.js';
import PowerupSystem from '../systems/PowerupSystem.js';

const STATE = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  RUN: 'RUN',
  JUMP: 'JUMP',
  FALL: 'FALL',
  CROUCH: 'CROUCH',
  HIT: 'HIT',
  DEATH: 'DEATH',
  DASH: 'DASH',
};

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    // Use the idle spritesheet as the base texture.
    super(scene, x, y, 'hero-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Use a stable physics body — fixed size, doesn't change with animation.
    // The offset is recomputed each time the animation state changes (because
    // each state's spritesheet has different frame dimensions). See
    // _updateState() for the offset recalculation.
    this.body.setSize(PLAYER_BODY.width, PLAYER_BODY.height, false);
    this._syncBodyOffset();
    this.body.setAllowGravity(true);
    this.body.setCollideWorldBounds(false);
    this.setOrigin(0.5, 1.0);
    this.setDepth(100);

    // ---- State ----
    this.state = STATE.IDLE;
    this.facing = 1;            // 1 = right, -1 = left
    this.dead = false;

    // ---- Game-feel timers (ms) ----
    this.coyoteUntil = 0;
    this.jumpBufferUntil = 0;
    this.lastGrounded = 0;
    this.dashCooldownUntil = 0;
    this.dashUntil = 0;
    this.dashDirection = 1;
    this.dashEnergyCost = PHYSICS.dashShadowEnergyCost;

    // ---- Shadow Energy ----
    this.shadowEnergy = PHYSICS.shadowEnergyMax;

    // ---- Health / lives ----
    this.maxHealth = PHYSICS.maxHealth;
    this.health = this.maxHealth;
    this.invulnUntil = 0;
    this.knockbackUntil = 0;

    // ---- Powerups ----
    this.powerups = new PowerupSystem(this);
    this.extraJumpsUsed = 0;
    this.maxExtraJumps = 0;

    // ---- Shadow Echo ----
    this.echoBuffer = [];   // [{x,y,t,frame,flipX}, ...]
    this.echoMaxMs = 2500;
    this.echoGhost = null;  // visual replay sprite

    // ---- Afterimages (for dash) ----
    this.afterImages = [];

    // ---- Input system ref (set later) ----
    this.input = null;

    // ---- Squash/stretch tween for landing ----
    this.squashTween = null;

    // Wire scene update
    this.scene.events.on('update', this.update, this);
    this.scene.events.once('shutdown', () => this.scene.events.off('update', this.update, this));
  }

  setInputSystem(input) { this.input = input; }

  // ---------------------------------------------------------------- update
  update(time, delta) {
    if (this.dead) {
      this._updateAfterImages();
      return;
    }
    if (this.input === null) return;
    // Hit-stop check
    if (this.scene.combat && this.scene.combat.isFrozen()) {
      // Pause physics during hit-stop
      this.body.setVelocity(0, this.body.velocity.y);
      return;
    }

    const dt = delta / 1000;
    const inp = this.input.state;
    const body = this.body;
    const now = this.scene.time.now;

    // ----- Shadow Energy regen -----
    if (this.shadowEnergy < PHYSICS.shadowEnergyMax) {
      this.shadowEnergy = Math.min(PHYSICS.shadowEnergyMax,
        this.shadowEnergy + PHYSICS.shadowEnergyRegen * dt);
    }

    // ----- Horizontal intent -----
    let move = 0;
    if (inp.left)  move -= 1;
    if (inp.right) move += 1;
    // Knockback overrides input
    if (now < this.knockbackUntil) move = 0;

    // ----- Dash handling -----
    if (this._handleDash(inp, now)) {
      // While dashing we suppress normal horizontal control
    } else if (now < this.dashUntil + 30) {
      // Just exited dash — keep some momentum
    } else {
      this._applyHorizontal(move, dt);
    }

    // ----- Vertical / jump -----
    this._handleJump(inp, now);
    this._applyGravity(dt);

    // ----- Crouch -----
    this.crouching = inp.crouch && body.onFloor();

    // ----- Update animation state -----
    this._updateState(move);
    this._updateFlip(move);

    // ----- Track ground time / coyote -----
    if (body.onFloor()) {
      if (!this.wasGrounded) this._onLand();
      this.lastGrounded = now;
      this.coyoteUntil = now + PHYSICS.coyoteTime;
      this.extraJumpsUsed = 0;
      if (this.powerups.isActive('doubleJump')) this.maxExtraJumps = 1;
      else this.maxExtraJumps = 0;
    }
    this.wasGrounded = body.onFloor();

    // ----- Shadow Echo recording -----
    this._recordEcho(now);

    // ----- Afterimage update -----
    this._updateAfterImages();

    // ----- Powerups update -----
    this.powerups.update();

    // ----- Coin magnet -----
    if (this.powerups.isActive('magnet') && this.scene.collectibles) {
      this.scene.collectibles.children.iterate((c) => {
        if (!c || !c.active) return;
        if (c.getData('type') !== 'coin') return;
        const dx = this.x - c.x, dy = (this.y - 60) - c.y;
        const d = Math.hypot(dx, dy);
        if (d < 240) {
          c.x += dx * 0.12;
          c.y += dy * 0.12;
        }
      });
    }
  }

  // ------------------------------------------------------------ horizontal
  _applyHorizontal(move, dt) {
    const body = this.body;
    const sprinting = (this.input.state.sprint || this.powerups.isActive('speed')) && !this.crouching;
    const speedMul = this.powerups.isActive('speed') ? 1.25 : 1.0;
    const targetSpeed = (this.crouching ? PHYSICS.crouchSpeed
                          : sprinting ? PHYSICS.runSpeed
                          : PHYSICS.walkSpeed) * speedMul;
    const accel = body.onFloor() ? PHYSICS.groundAccel : PHYSICS.airAccel;
    const decel = body.onFloor() ? PHYSICS.groundDecel : PHYSICS.airDecel;

    const vx = body.velocity.x;
    const reversing = (vx > 0 && move < 0) || (vx < 0 && move > 0);

    if (move !== 0) {
      const a = (reversing ? accel * PHYSICS.turnAroundBoost : accel);
      const desiredVx = move * targetSpeed;
      if (Math.abs(vx - desiredVx) < a * dt) {
        body.setVelocityX(desiredVx);
      } else {
        body.setVelocityX(vx + Math.sign(desiredVx - vx) * a * dt);
      }
    } else {
      // Decelerate toward zero
      const dv = decel * dt;
      if (Math.abs(vx) <= dv) body.setVelocityX(0);
      else body.setVelocityX(vx - Math.sign(vx) * dv);
    }
  }

  // ------------------------------------------------------------------ jump
  _handleJump(inp, now) {
    const body = this.body;

    // Buffer jump press
    if (this.input.jumpJustPressed(now)) {
      this.jumpBufferUntil = now + PHYSICS.jumpBuffer;
    } else if (this.input.jumpPressedSince(now, 4)) {
      // Already-consumed by edge, keep buffer alive
    }

    const wantsJump = now < this.jumpBufferUntil;
    const canGroundJump = now < this.coyoteUntil;
    const canDoubleJump = this.extraJumpsUsed < this.maxExtraJumps;

    if (wantsJump && (canGroundJump || canDoubleJump)) {
      const power = canGroundJump ? 1.0 : 0.85;  // weaker double-jump
      body.setVelocityY(PHYSICS.jumpVelocity * power);
      this.jumpBufferUntil = 0;
      this.coyoteUntil = 0;
      if (!canGroundJump) this.extraJumpsUsed++;
      AudioSystem.play('jump');
      this._spawnJumpDust();
      this._squash(0.85, 1.15, 90);
    }

    // Variable jump height: if released early and still rising, cut velocity
    if (!inp.jump && body.velocity.y < PHYSICS.variableJumpCutoff) {
      body.setVelocityY(PHYSICS.variableJumpCutoff);
    }
  }

  // ----------------------------------------------------------------- dash
  _handleDash(inp, now) {
    if (now < this.dashUntil) {
      // During dash: override velocity, ignore gravity, spawn afterimage
      this.body.setVelocityX(this.dashDirection * PHYSICS.dashSpeed);
      this.body.setVelocityY(0);
      this.body.setAllowGravity(false);
      if (now - (this._lastAfterImageAt || 0) > 30) {
        this._spawnAfterImage();
        this._lastAfterImageAt = now;
      }
      return true;
    } else if (this._dashActiveLastFrame) {
      // Just ended
      this.body.setAllowGravity(true);
      this._dashActiveLastFrame = false;
    }

    if (this.input.dashPressedSince(now, 200)) {
      if (now >= this.dashCooldownUntil && this.shadowEnergy >= this.dashEnergyCost) {
        this.input.clearDashBuffer();
        this.dashDirection = inp.left ? -1 : inp.right ? 1 : this.facing;
        this.dashUntil = now + PHYSICS.dashDuration;
        this.dashCooldownUntil = now + PHYSICS.dashCooldown;
        this.shadowEnergy -= this.dashEnergyCost;
        this._dashActiveLastFrame = true;
        this.invulnUntil = Math.max(this.invulnUntil, now + PHYSICS.dashDuration);
        AudioSystem.play('dash');
        if (this.scene.camera) this.scene.camera.dashImpulse();
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------- gravity
  _applyGravity(dt) {
    const body = this.body;
    if (!body.allowGravity) return;
    // Custom gravity (we kept arcade gravity at 0 globally)
    const g = PHYSICS.gravity;
    let vy = body.velocity.y + g * dt;
    if (vy > PHYSICS.maxFallSpeed) vy = PHYSICS.maxFallSpeed;
    body.setVelocityY(vy);
  }

  // ----------------------------------------------------------- animation
  _updateState(move) {
    const body = this.body;
    const now = this.scene.time.now;
    let next = STATE.IDLE;

    if (this.dead) next = STATE.DEATH;
    else if (now < this.dashUntil) next = STATE.DASH;
    else if (now < this.knockbackUntil) next = STATE.HIT;
    else if (!body.onFloor()) next = body.velocity.y < -40 ? STATE.JUMP : STATE.FALL;
    else if (this.crouching) next = STATE.CROUCH;
    else if (move !== 0) {
      const sprinting = (this.input.state.sprint || this.powerups.isActive('speed'));
      next = sprinting ? STATE.RUN : STATE.WALK;
    }

    if (next !== this.state) {
      this.state = next;
      const key = heroAnimKey(next);
      this.anims.play(key, true);
      // Recompute body offset so the body stays anchored to the hero's feet
      // within the new animation's (potentially different) frame dimensions.
      this._syncBodyOffset();
    }

    // Hit flicker
    if (this.invulnUntil > now && !this.dead) {
      this.setAlpha((Math.floor(now / 60) % 2 === 0) ? 0.35 : 1);
    } else if (this.powerups.isActive('shadowMode')) {
      this.setAlpha(0.65);
      this.setTint(COLORS.shadow);
    } else if (this.powerups.isActive('shield')) {
      this.setTint(0xaaffdd);
      this.setAlpha(1);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }
  }

  // Recompute the body's offset so the body sits at the bottom-center of the
  // hero's current animation frame. Called whenever the animation state
  // changes — within a single animation all frames share the same dimensions
  // (guaranteed by scripts/process_assets.py).
  _syncBodyOffset() {
    const frame = this.anims && this.anims.currentFrame ? this.anims.currentFrame.frame : this.frame;
    if (!frame) return;
    const fw = frame.width;
    const fh = frame.height;
    this.body.setSize(PLAYER_BODY.width, PLAYER_BODY.height, false);
    this.body.setOffset((fw - PLAYER_BODY.width) / 2, fh - PLAYER_BODY.height);
  }

  _updateFlip(move) {
    if (move > 0) { this.facing = 1; this.setFlipX(false); }
    else if (move < 0) { this.facing = -1; this.setFlipX(true); }
    // While dashing, keep facing dash direction
    if (this.scene.time.now < this.dashUntil) {
      this.setFlipX(this.dashDirection < 0);
      this.facing = this.dashDirection;
    }
  }

  _onLand() {
    AudioSystem.play('land');
    if (this.scene.particles) this.scene.particles.landingDust(this.x, this.y);
    this._squash(1.12, 0.88, 110);
    if (this.scene.camera) this.scene.camera.landingImpulse();
  }

  _squash(sx, sy, dur) {
    if (this.squashTween) this.squashTween.stop();
    this.setScale(sx, sy);
    this.squashTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1, scaleY: 1,
      duration: dur,
      ease: 'Quad.Out',
    });
  }

  _spawnJumpDust() {
    if (this.scene.particles) this.scene.particles.landingDust(this.x, this.y);
  }

  // ----------------------------------------------------------- afterimage
  _spawnAfterImage() {
    const img = this.scene.add.sprite(this.x, this.y, this.texture.key, this.anims.currentFrame?.textureFrame)
      .setOrigin(0.5, 1.0)
      .setFlipX(this.flipX)
      .setDepth(99)
      .setTint(COLORS.shadow)
      .setAlpha(0.55);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => img.destroy(),
    });
    this.afterImages.push(img);
    if (this.afterImages.length > 8) {
      const old = this.afterImages.shift();
      if (old && old.active) old.destroy();
    }
  }

  _updateAfterImages() {
    // Filter out destroyed
    this.afterImages = this.afterImages.filter((i) => i && i.active);
  }

  // -------------------------------------------------------------- shadow echo
  _recordEcho(now) {
    this.echoBuffer.push({
      x: this.x, y: this.y,
      flipX: this.flipX,
      t: now,
      texture: this.texture.key,
      frame: this.anims.currentFrame?.textureFrame || 0,
    });
    const cutoff = now - this.echoMaxMs;
    while (this.echoBuffer.length && this.echoBuffer[0].t < cutoff) this.echoBuffer.shift();
  }

  // Public: trigger a 2-second echo replay. Visual only.
  triggerEchoReplay() {
    if (this.echoGhost) { this.echoGhost.destroy(); this.echoGhost = null; }
    if (this.echoBuffer.length < 4) return;
    const ghost = this.scene.add.sprite(this.echoBuffer[0].x, this.echoBuffer[0].y, this.echoBuffer[0].texture, this.echoBuffer[0].frame)
      .setOrigin(0.5, 1.0)
      .setDepth(98)
      .setAlpha(0.5)
      .setTint(COLORS.shadowBright);
    this.echoGhost = ghost;
    const startT = this.scene.time.now;
    const startEchoT = this.echoBuffer[0].t;
    const dur = this.echoBuffer[this.echoBuffer.length - 1].t - startEchoT;
    this.scene.tweens.add({
      targets: { v: 0 },
      v: 1,
      duration: dur,
      onUpdate: (tw) => {
        const v = tw.getValue();
        const idx = Math.floor(v * (this.echoBuffer.length - 1));
        const e = this.echoBuffer[idx];
        if (e && ghost.active) {
          ghost.setPosition(e.x, e.y);
          ghost.setFlipX(e.flipX);
          ghost.setTexture(e.texture, e.frame);
        }
      },
      onComplete: () => {
        this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 400, onComplete: () => ghost.destroy() });
        this.echoGhost = null;
      },
    });
    if (this.scene.hud) this.scene.hud.showToast('SHADOW ECHO');
  }

  // ------------------------------------------------------------- damage/death
  takeDamage(amount = 1, opts = {}) {
    if (this.dead) return;
    const now = this.scene.time.now;
    if (this.invulnUntil > now) return;
    if (this.powerups.consumeShield()) {
      this.invulnUntil = now + 600;
      AudioSystem.play('powerUp');
      return;
    }
    this.health -= amount;
    this.invulnUntil = now + PHYSICS.invulnTime;
    AudioSystem.play('damage');
    if (this.scene.particles) this.scene.particles.damageBurst(this.x, this.y - this.body.height / 2);
    if (this.scene.camera) this.scene.camera.damageShake();

    if (this.health <= 0) {
      this.die();
      return;
    }

    // Knockback
    const fromX = opts.sourceX !== undefined ? opts.sourceX : this.x - this.facing * 30;
    const dir = Math.sign(this.x - fromX) || this.facing;
    this.knockbackUntil = now + 220;
    this.body.setVelocityX(dir * 240);
    this.body.setVelocityY(-260);
    if (this.scene.hud) this.scene.hud.flashDamage();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.body.setVelocity(0, -360);
    this.body.setAllowGravity(true);
    this.anims.play('hero-death', true);
    AudioSystem.play('death');
    if (this.scene.camera) this.scene.camera.impulseShake(12, 400);
    this.scene.time.delayedCall(1400, () => {
      if (this.scene && this.scene.handlePlayerDeath) this.scene.handlePlayerDeath();
    });
  }

  respawn(x, y) {
    this.dead = false;
    this.health = this.maxHealth;
    this.body.reset(x, y);
    this.body.setAllowGravity(true);
    this.clearTint();
    this.setAlpha(1);
    this.invulnUntil = this.scene.time.now + 800;
    this.state = STATE.IDLE;
    this.anims.play('hero-idle', true);
  }

  // ------------------------------------------------------------ shadow energy
  addShadowEnergy(amount) {
    this.shadowEnergy = Math.min(PHYSICS.shadowEnergyMax, this.shadowEnergy + amount);
  }
}
