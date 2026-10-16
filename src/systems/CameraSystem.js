// src/systems/CameraSystem.js
// Premium platformer camera. Smooth follow, horizontal look-ahead, vertical
// damping, landing impulse, dash impulse, damage shake. World bounds enforced.

import Phaser from 'phaser';
import SaveSystem from './SaveSystem.js';

export default class CameraSystem {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.cam = scene.cameras.main;

    // State
    this.lookAheadX = 0;     // current offset in pixels
    this.lookAheadTarget = 0;
    this.deadZoneX = 80;
    this.deadZoneY = 40;
    this.followLerp = 0.08;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.zoomImpulse = 0;
  }

  setBounds(x, y, w, h) {
    this.bounds = { x, y, w, h };
    this.cam.setBounds(x, y, w, h);
  }

  snap(x, y) {
    this.cam.centerOn(x, y);
  }

  impulseShake(intensity, duration) {
    const factor = SaveSystem.getSettings().screenShake;
    intensity *= factor;
    if (intensity <= 0) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  impulseZoom(amount) {
    this.zoomImpulse = Math.max(this.zoomImpulse, amount);
  }

  update(dt) {
    if (!this.target || !this.target.active) return;
    const t = this.target;
    const dts = dt / 1000;

    // Look-ahead based on facing & horizontal velocity
    const facing = (t.flipX ? -1 : 1);
    const speed = Math.abs(t.body?.velocity.x || 0);
    const desired = facing * Math.min(120, 40 + speed * 0.25);
    this.lookAheadTarget = desired;
    this.lookAheadX += (this.lookAheadTarget - this.lookAheadX) * 0.07;

    // Desired camera center
    const tx = t.x + this.lookAheadX;
    // Vertical: lift the focus slightly above the player so we see more below when falling
    const vy = t.body?.velocity.y || 0;
    const desiredLift = (vy > 0 ? Math.min(60, vy * 0.06) : 0);
    const ty = t.y - 20 - desiredLift;

    // Smoothly move camera center
    const mid = this.cam.midPoint;
    let nx = mid.x + (tx - mid.x) * this.followLerp;
    let ny = mid.y + (ty - mid.y) * (this.followLerp * 0.85);

    // Shake decay
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / this.shakeDuration);
      const mag = this.shakeIntensity * k * k;
      this.shakeOffsetX = (Math.random() * 2 - 1) * mag;
      this.shakeOffsetY = (Math.random() * 2 - 1) * mag;
      if (this.shakeTime <= 0) {
        this.shakeOffsetX = 0; this.shakeOffsetY = 0;
        this.shakeIntensity = 0;
      }
    } else {
      this.shakeOffsetX = 0; this.shakeOffsetY = 0;
    }

    // Zoom impulse (dash feel)
    if (this.zoomImpulse > 0) {
      this.cam.zoom = 1 - this.zoomImpulse * 0.012;
      this.zoomImpulse *= 0.85;
      if (this.zoomImpulse < 0.01) { this.zoomImpulse = 0; this.cam.zoom = 1; }
    }

    this.cam.centerOn(nx + this.shakeOffsetX, ny + this.shakeOffsetY);
  }

  landingImpulse() {
    this.impulseShake(4, 120);
  }

  dashImpulse() {
    this.impulseShake(6, 150);
    this.zoomImpulse = 0.6;
  }

  damageShake() {
    this.impulseShake(10, 220);
  }

  bossHit() {
    this.impulseShake(8, 180);
  }

  bossDeath() {
    this.impulseShake(16, 600);
    this.zoomImpulse = 1.0;
  }
}
