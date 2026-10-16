// src/scenes/GameOverScene.js
// Shown when the player runs out of lives (we model this as a per-death
// flow; for simplicity in this build, GameOver is reached after dying with
// no checkpoint). Offers Retry / Main Menu.

import Phaser from 'phaser';
import { SCENES, COLORS } from '../config/constants.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME_OVER); }

  init(data) {
    this.levelId = data?.levelId || 1;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x05060a, 0.95).setOrigin(0);

    this.add.text(W / 2, 220, 'YOU FELL INTO SHADOW', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '40px',
      color: '#ff4d6d',
      stroke: '#05060a',
      strokeThickness: 4,
    }).setOrigin(0.5).setLetterSpacing(6);

    const t = this.add.text(W / 2, 280, 'The shadows claimed another.', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '16px',
      color: '#8a8aa8',
    }).setOrigin(0.5).setLetterSpacing(4);

    this.tweens.add({ targets: t, alpha: { from: 0, to: 1 }, duration: 600 });

    this._makeButton(W / 2, 400, 'RETRY LEVEL', () => {
      AudioSystem.play('menuSelect');
      this.scene.stop();
      this.scene.start(SCENES.GAME, { levelId: this.levelId, fromCheckpoint: false });
    });
    this._makeButton(W / 2, 460, 'MAIN MENU', () => {
      AudioSystem.play('menuBack');
      this.scene.stop();
      this.scene.start(SCENES.MAIN_MENU);
    });
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
    txt.on('pointerdown', () => action());
  }
}
