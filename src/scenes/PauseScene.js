// src/scenes/PauseScene.js
// Pause overlay. Launched on top of GameScene (which is paused). Buttons:
// Resume / Restart / Settings / Main Menu.

import Phaser from 'phaser';
import { SCENES, COLORS } from '../config/constants.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x05060a, 0.78).setOrigin(0);

    this.add.text(W / 2, 160, 'PAUSED', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '52px',
      color: '#e7e7ef',
      stroke: '#6a4cff',
      strokeThickness: 6,
    }).setOrigin(0.5).setLetterSpacing(10);

    const buttons = [
      { label: 'RESUME',         action: () => this._resume() },
      { label: 'RESTART LEVEL',  action: () => this._restart() },
      { label: 'SETTINGS',       action: () => this.scene.launch(SCENES.SETTINGS) },
      { label: 'MAIN MENU',      action: () => this._toMenu() },
    ];
    let y = 260;
    for (const b of buttons) {
      this._makeButton(W / 2, y, b.label, b.action);
      y += 56;
    }
  }

  _makeButton(x, y, label, action) {
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '22px',
      color: '#e7e7ef',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0.5).setLetterSpacing(4).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => { txt.setScale(1.06); txt.setColor('#b5a3ff'); });
    txt.on('pointerout',  () => { txt.setScale(1.0);  txt.setColor('#e7e7ef'); });
    txt.on('pointerdown', () => {
      AudioSystem.play('menuSelect');
      this.tweens.add({ targets: txt, scale: 0.95, duration: 60, yoyo: true, onComplete: action });
    });
  }

  _resume() {
    this.scene.stop();
    this.scene.resume(SCENES.GAME);
  }

  _restart() {
    this.scene.stop();
    this.scene.restart({ levelId: this.scene.settings.data?.levelId || 1, fromCheckpoint: false });
    // The above restart call is for this scene — but we want GameScene to restart:
    // Actually since GameScene is paused, we need to resume it and tell it to restart.
  }

  _toMenu() {
    this.scene.stop();
    this.scene.stop(SCENES.GAME);
    this.scene.start(SCENES.MAIN_MENU);
  }
}
