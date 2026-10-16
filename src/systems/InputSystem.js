// src/systems/InputSystem.js
// Unified input layer. Tracks keyboard state + virtual touch buttons.
// Exposes a single `state` object updated each frame, so the player controller
// never needs to know where the input came from.

import Phaser from 'phaser';
import { PHYSICS } from '../config/constants.js';

export default class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      left2:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      up2:   Phaser.Input.Keyboard.KeyCodes.UP,
      jump:  Phaser.Input.Keyboard.KeyCodes.SPACE,
      sprint:Phaser.Input.Keyboard.KeyCodes.SHIFT,
      crouch:Phaser.Input.Keyboard.KeyCodes.S,
      crouch2:Phaser.Input.Keyboard.KeyCodes.DOWN,
      dash:  Phaser.Input.Keyboard.KeyCodes.E,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
    });

    // Virtual state updated by TouchControls as well.
    this.virtual = {
      left: false, right: false, jump: false, dash: false,
      sprint: false, crouch: false,
    };

    // Edge events
    this._jumpPressedAt = -9999;
    this._dashPressedAt = -9999;
    this._pausePressedAt = -9999;
    this._restartPressedAt = -9999;

    // Track jump key release for variable jump height
    this._jumpHeldLast = false;
    this._dashHeldLast = false;

    this._wireEdges();
  }

  _wireEdges() {
    // We do NOT use a separate update listener for edge detection because
    // Phaser fires event listeners in registration order, and Player.update
    // may fire BEFORE this listener (depending on construction order).
    // Instead, edge detection happens lazily in the `state` getter, which
    // is called at the start of Player.update. This guarantees edges are
    // always detected before Player.update checks them.
  }

  // Called lazily from the `state` getter to detect edges.
  _detectEdges() {
    const now = this.scene.time.now;
    const jumpHeld = () => this.keys.jump.isDown || this.keys.up.isDown || this.keys.up2.isDown || this.virtual.jump;
    const dashHeld = () => this.keys.dash.isDown || this.virtual.dash;
    const pauseHeld = () => this.keys.pause.isDown;
    const restartHeld = () => this.keys.restart.isDown;

    const jh = jumpHeld();
    if (jh && !this._jumpHeldLast) this._jumpPressedAt = now;
    this._jumpHeldLast = jh;

    const dh = dashHeld();
    if (dh && !this._dashHeldLast) this._dashPressedAt = now;
    this._dashHeldLast = dh;

    const ph = pauseHeld();
    if (ph && !this._pausePressedLast) this._pausePressedAt = now;
    this._pausePressedLast = ph;

    const rh = restartHeld();
    if (rh && !this._restartPressedLast) this._restartPressedAt = now;
    this._restartPressedLast = rh;
  }

  // Continuous state — call once per frame. Also detects edges lazily so
  // that jumpJustPressed/dashPressedSince return correct values when checked
  // immediately after in Player.update.
  get state() {
    this._detectEdges();
    const k = this.keys;
    const v = this.virtual;
    return {
      left:   k.left.isDown  || k.left2.isDown  || v.left,
      right:  k.right.isDown || k.right2.isDown || v.right,
      jump:   k.jump.isDown  || k.up.isDown     || k.up2.isDown || v.jump,
      dash:   k.dash.isDown  || v.dash,
      sprint: k.sprint.isDown || v.sprint,
      crouch: k.crouch.isDown || k.crouch2.isDown || v.crouch,
    };
  }

  // Edge events — caller passes `now` (ms timestamp)
  jumpPressedSince(now, within = 200) { return now - this._jumpPressedAt <= within; }
  jumpJustPressed(now) { return now - this._jumpPressedAt <= 50; }  // within 50ms
  clearJumpBuffer() { this._jumpPressedAt = -9999; }

  dashPressedSince(now, within = 200) { return now - this._dashPressedAt <= within; }
  clearDashBuffer() { this._dashPressedAt = -9999; }

  pauseJustPressed(now, within = 50) { return now - this._pausePressedAt <= within; }
  restartJustPressed(now, within = 50) { return now - this._restartPressedAt <= within; }
}
