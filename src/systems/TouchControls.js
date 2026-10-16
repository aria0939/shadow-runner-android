// src/systems/TouchControls.js
// On-screen mobile controls with a proper D-Pad on the left and action
// buttons on the right. Multi-touch is fully supported — each button
// tracks the pointer that first landed on it, so the player can hold
// LEFT and tap JUMP simultaneously.
//
// Layout:
//   LEFT side:  D-Pad (cross-shaped) with UP / LEFT / RIGHT / DOWN
//   RIGHT side: JUMP (large) + DASH (medium) + RUN (small) + CROUCH (small)
//   TOP-RIGHT:  PAUSE (small)
//
// All buttons are translucent and become more visible when pressed.

import Phaser from 'phaser';
import { COLORS } from '../config/constants.js';
import SaveSystem from './SaveSystem.js';

export default class TouchControls {
  constructor(scene, inputSystem) {
    this.scene = scene;
    this.input = inputSystem;
    this.buttons = {};
    this.visible = true;
    this.opacity = SaveSystem.getSettings().touchOpacity;
    this.sizeScale = SaveSystem.getSettings().touchSize;

    this._build();
    this._updateOpacity();

    // Rebuild on resize (Scale.RESIZE mode changes canvas size dynamically).
    this._resizeHandler = this.scene.scale.on('resize', () => {
      this.destroy();
      this.buttons = {};
      this._build();
      this._updateOpacity();
    });
  }

  _build() {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const s = this.sizeScale;
    // D-Pad button size — scaled to viewport height so it looks right on
    // both phones and tablets.
    const baseUnit = Math.min(W, H) * 0.11 * s;
    const r = Math.max(28, baseUnit);

    this.container = this.scene.add.container(0, 0).setDepth(9000).setScrollFactor(0);

    // ---- LEFT SIDE: D-Pad (cross layout) ----
    // Center of the D-Pad is at (dpadCx, dpadCy)
    const dpadCx = r + 50;
    const dpadCy = H - r - 50;
    const gap = r * 0.1; // small gap between buttons

    // UP
    this._makeCircleButton('dpadUp', dpadCx, dpadCy - r - gap, r * 0.85, '\u25B2', 'UP');
    // DOWN
    this._makeCircleButton('dpadDown', dpadCx, dpadCy + r + gap, r * 0.85, '\u25BC', 'DN');
    // LEFT
    this._makeCircleButton('dpadLeft', dpadCx - r - gap, dpadCy, r * 0.85, '\u25C0', 'LT');
    // RIGHT
    this._makeCircleButton('dpadRight', dpadCx + r + gap, dpadCy, r * 0.85, '\u25B6', 'RT');

    // The D-Pad up/down map to jump/crouch (optional). We'll keep them as
    // directional only — JUMP has its own button on the right.
    // Wire D-Pad directions to the input system's virtual state.

    // ---- RIGHT SIDE: Action buttons ----
    const jumpR = r * 1.1;
    const dashR = r * 0.9;
    const smallR = r * 0.65;

    // JUMP — bottom right (primary)
    const jumpX = W - jumpR - 40;
    const jumpY = H - jumpR - 50;
    this._makeCircleButton('jump', jumpX, jumpY, jumpR, 'JUMP', '\u2191');

    // DASH — above-left of JUMP
    const dashX = jumpX - jumpR - dashR * 0.6 - 10;
    const dashY = jumpY - jumpR * 0.3;
    this._makeCircleButton('dash', dashX, dashY, dashR, 'DASH', '\u21C9');

    // RUN — smaller, above DASH
    const runX = dashX - dashR - smallR * 0.4 - 6;
    const runY = dashY - dashR * 0.4;
    this._makeCircleButton('sprint', runX, runY, smallR, 'RUN', '\u21BB', 0.85);

    // CROUCH — small, left of JUMP
    const crouchX = jumpX - jumpR - smallR * 0.4 - 6;
    const crouchY = jumpY + jumpR * 0.3;
    this._makeCircleButton('crouch', crouchX, crouchY, smallR, 'DN', '\u2193', 0.85);

    // ---- TOP-RIGHT: PAUSE ----
    this._makeCircleButton('pause', W - 36, 36, 24, 'II', 'II', 0.6, true);
  }

  _makeCircleButton(name, x, y, r, label, glyph, alphaMul = 1, square = false) {
    const gfx = this.scene.add.graphics();
    const drawColor = COLORS.shadow;
    const drawRing = COLORS.shadowBright;

    const redraw = (pressed) => {
      gfx.clear();
      const fillA = (pressed ? 0.55 : 0.18) * alphaMul * this.opacity;
      const ringA = (pressed ? 1.0 : 0.55) * alphaMul * this.opacity;
      // Outer ring
      gfx.lineStyle(2.5, drawRing, ringA);
      gfx.strokeCircle(0, 0, r);
      // Inner fill
      gfx.fillStyle(0x05060a, fillA);
      gfx.fillCircle(0, 0, r - 1);
      // Inner glow when pressed
      if (pressed) {
        gfx.fillStyle(drawColor, ringA * 0.5);
        gfx.fillCircle(0, 0, r * 0.6);
      } else {
        gfx.fillStyle(drawColor, ringA * 0.15);
        gfx.fillCircle(0, 0, r * 0.5);
      }
    };
    redraw(false);

    // Label text
    const fontSize = Math.floor(r * 0.4);
    const txt = this.scene.add.text(0, 0, label, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: `${fontSize}px`,
      fontWeight: 'bold',
      color: '#e7e7ef',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Hit area — slightly larger than visual for easier touch
    const hitSize = r * 2.4;
    const hit = this.scene.add.zone(x, y, hitSize, hitSize).setInteractive();
    const container = this.scene.add.container(x, y, [gfx, txt]).setDepth(9000);
    hit.container = container;
    hit.gfx = gfx;
    hit.txt = txt;
    hit.pressed = false;
    hit.redraw = () => redraw(hit.pressed);

    // Multi-touch: each button tracks its own pointer.
    hit.on('pointerdown', (pointer) => {
      if (hit.pressed) return;
      hit.pressed = true;
      hit.pointerId = pointer.id;
      hit.redraw();
      this._setVirtual(name, true);
      if (name === 'pause') this._onPause();
    });
    hit.on('pointerup', (pointer) => {
      if (hit.pointerId !== undefined && pointer.id !== hit.pointerId) return;
      hit.pressed = false;
      hit.pointerId = undefined;
      hit.redraw();
      this._setVirtual(name, false);
    });
    hit.on('pointerupoutside', (pointer) => {
      if (hit.pointerId !== undefined && pointer.id !== hit.pointerId) return;
      hit.pressed = false;
      hit.pointerId = undefined;
      hit.redraw();
      this._setVirtual(name, false);
    });

    this.buttons[name] = { hit, container, gfx, txt };
    this.container.add([container, hit]);
  }

  _setVirtual(name, val) {
    const v = this.input.virtual;
    // D-Pad mappings
    const map = {
      dpadLeft: 'left',
      dpadRight: 'right',
      dpadUp: 'jump',     // D-Pad up also triggers jump (common in platformers)
      dpadDown: 'crouch', // D-Pad down = crouch
      jump: 'jump',
      dash: 'dash',
      sprint: 'sprint',
      crouch: 'crouch',
    };
    if (name in map) {
      v[map[name]] = val;
    }
  }

  _onPause() {
    const sc = this.scene.scene;
    if (sc.isActive('GameScene') && !sc.isPaused('GameScene')) {
      sc.pause('GameScene');
      sc.launch('PauseScene');
    }
  }

  _updateOpacity() {
    for (const name in this.buttons) {
      const b = this.buttons[name];
      b.hit.redraw();
    }
  }

  setOpacity(v) {
    this.opacity = v;
    this._updateOpacity();
  }

  setVisible(v) {
    this.visible = v;
    this.container.setVisible(v);
  }

  destroy() {
    if (this.container) this.container.destroy();
    this.buttons = {};
    this.container = null;
  }
}
