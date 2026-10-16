// src/systems/PowerupSystem.js
// Manages active timed power-ups on the player: Speed Boost, Double Jump,
// Shield, Coin Magnet, Shadow Mode. Each power-up has a duration and applies
// modifiers to the player's state during update().

import Phaser from 'phaser';
import AudioSystem from './AudioSystem.js';

const DURATIONS = {
  speed:       8000,
  doubleJump:  12000,
  shield:      7000,
  magnet:      9000,
  shadowMode:  6000,
};

export default class PowerupSystem {
  constructor(player) {
    this.player = player;
    this.scene = player.scene;
    this.active = {
      speed:      { until: 0, dur: 0 },
      doubleJump: { until: 0, dur: 0 },
      shield:     { until: 0, dur: 0 },
      magnet:     { until: 0, dur: 0 },
      shadowMode: { until: 0, dur: 0 },
    };
  }

  activate(name) {
    if (!(name in this.active)) return;
    const dur = DURATIONS[name];
    this.active[name].dur = dur;
    this.active[name].until = this.scene.time.now + dur;
    AudioSystem.play('powerUp');
    if (this.scene.particles) this.scene.particles.checkpointPulse(this.player.x, this.player.y - this.player.body.height / 2);
    if (this.scene.hud) this.scene.hud.showToast(this._label(name));
  }

  isActive(name) {
    return this.scene.time.now < this.active[name].until;
  }

  remaining(name) {
    return Math.max(0, this.active[name].until - this.scene.time.now);
  }

  update() {
    const now = this.scene.time.now;
    // Shield expiry triggers a small visual cue
    for (const name of Object.keys(this.active)) {
      const a = this.active[name];
      if (a.dur > 0 && now >= a.until && a.until > 0 && a.dur > 0) {
        // Just expired
        if (a._wasActive !== false) {
          a._wasActive = false;
        }
      } else if (now < a.until) {
        a._wasActive = true;
      }
    }
  }

  // Player can call this to see if shield should absorb damage.
  consumeShield() {
    if (this.isActive('shield')) {
      this.active.shield.until = 0;
      return true;
    }
    return false;
  }

  _label(name) {
    return {
      speed: 'SPEED BOOST',
      doubleJump: 'DOUBLE JUMP',
      shield: 'SHIELD',
      magnet: 'COIN MAGNET',
      shadowMode: 'SHADOW MODE',
    }[name] || name.toUpperCase();
  }
}
