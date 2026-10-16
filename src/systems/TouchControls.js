// src/systems/TouchControls.js
// On-screen mobile controls. Drawn directly on the Phaser canvas (not DOM)
// so they participate in scene scaling and rendering. Multi-touch is supported
// via Phaser pointer tracking — each button listens to the pointer that first
// lands on it.

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
    const r = 64 * s;

    this.container = this.scene.add.container(0, 0).setDepth(9000).setScrollFactor(0);

    // Left side: LEFT / RIGHT pad
    const leftX = r + 24, rightX = r + 24 + r * 2 + 16, padY = H - r - 36;
    this._makeButton('left',  leftX,  padY, r, '\u25C0', '\u2190');
    this._makeButton('right', rightX, padY, r, '\u25B6', '\u2192');

    // Right side: JUMP + DASH
    const jumpX = W - r - 24, jumpY = H - r - 36;
    const dashX = jumpX - r - 16 - r * 0.4, dashY = jumpY - r * 0.6;
    this._makeButton('jump', jumpX, jumpY, r * 1.05, 'JUMP', '\u2191');
    this._makeButton('dash', dashX, dashY, r * 0.85, 'DASH', '\u21C9');

    // Smaller secondary: SPRINT, CROUCH
    const sprintX = rightX + r + 14, sprintY = padY - r * 0.4;
    this._makeButton('sprint', sprintX, sprintY, r * 0.55, 'RUN',  '\u21BB', 0.85);
    const crouchX = leftX - r - 14, crouchY = padY - r * 0.4;
    this._makeButton('crouch', crouchX, crouchY, r * 0.55, 'CRCH', '\u2193', 0.85);

    // PAUSE button (top-right, small)
    this._makeButton('pause', W - 50, 40, 28, 'II', 'II', 0.6, true);
  }

  _makeButton(name, x, y, r, label, glyph, alphaMul = 1, square = false) {
    const size = r * 2;
    const gfx = this.scene.add.graphics();
    const drawColor = COLORS.shadow;
    const drawRing  = COLORS.shadowBright;

    const redraw = (pressed) => {
      gfx.clear();
      const fillA = (pressed ? 0.55 : 0.20) * alphaMul * this.opacity;
      const ringA = (pressed ? 1.0  : 0.55) * alphaMul * this.opacity;
      gfx.fillStyle(0x05060a, fillA);
      gfx.fillCircle(0, 0, r);
      gfx.lineStyle(2, drawRing, ringA);
      gfx.strokeCircle(0, 0, r);
      gfx.fillStyle(drawColor, ringA * 0.4);
      gfx.fillCircle(0, 0, r * 0.55);
    };
    redraw(false);

    const txt = this.scene.add.text(0, -2, label, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: `${Math.floor(r * 0.32)}px`,
      color: '#e7e7ef',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const hit = this.scene.add.zone(x, y, size * 1.2, size * 1.2).setInteractive();
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
    // pointerupoutside / pointermove handling — if a tracked pointer leaves
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
    if (name in v) v[name] = val;
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
    this.container.destroy();
    this.buttons = {};
  }
}
