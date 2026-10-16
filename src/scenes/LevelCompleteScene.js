// src/scenes/LevelCompleteScene.js
// Shown when a level is finished. Displays stats (score, coins, fragments,
// time). Auto-advances to next level or to credits if all five complete.

import Phaser from 'phaser';
import { SCENES, COLORS, LEVELS } from '../config/constants.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class LevelCompleteScene extends Phaser.Scene {
  constructor() { super(SCENES.LEVEL_COMPLETE); }

  init(data) {
    this.stats = data || {};
    this.levelId = data?.levelId || 1;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    AudioSystem.playMusic('victory');
    this.add.rectangle(0, 0, W, H, 0x05060a, 0.92).setOrigin(0);

    const lvl = LEVELS.find((l) => l.id === this.levelId);
    this.add.text(W / 2, 120, 'LEVEL COMPLETE', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '44px',
      color: '#e7e7ef',
      stroke: '#6a4cff',
      strokeThickness: 6,
    }).setOrigin(0.5).setLetterSpacing(8);

    this.add.text(W / 2, 180, (lvl?.name || '').toUpperCase(), {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '22px',
      color: '#b5a3ff',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0.5).setLetterSpacing(6);

    // Stats card
    const cardX = W / 2 - 220, cardY = 240;
    this.add.rectangle(cardX, cardY, 440, 220, 0x14162a, 0.9)
      .setStrokeStyle(2, COLORS.shadowBright).setOrigin(0);

    const lines = [
      ['SCORE',           String(this.stats.score ?? 0)],
      ['COINS',           String(this.stats.coins ?? 0)],
      ['SHADOW FRAGMENTS', `${this.stats.fragments ?? 0} / 3`],
      ['TIME',            this._fmtTime(this.stats.time ?? 0)],
    ];
    lines.forEach((row, i) => {
      this.add.text(cardX + 30, cardY + 30 + i * 36, row[0], {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '16px',
        color: '#8a8aa8',
      }).setLetterSpacing(3);
      this.add.text(cardX + 410, cardY + 30 + i * 36, row[1], {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '20px',
        color: '#e7e7ef',
      }).setOrigin(1, 0).setLetterSpacing(2);
    });

    // Stars for fragments
    const stars = '\u2605'.repeat(this.stats.fragments ?? 0) + '\u2606'.repeat(3 - (this.stats.fragments ?? 0));
    this.add.text(W / 2, 500, stars, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '40px',
      color: '#ffd166',
      stroke: '#05060a',
      strokeThickness: 4,
    }).setOrigin(0.5).setLetterSpacing(20);

    // Continue button
    const isLast = this.levelId >= 5;
    const label = isLast ? 'FINISH' : 'NEXT LEVEL';
    this._makeButton(W / 2, 600, label, () => {
      AudioSystem.play('menuSelect');
      if (isLast) {
        this.scene.start(SCENES.CREDITS);
      } else {
        this.scene.start(SCENES.GAME, { levelId: this.levelId + 1, fromCheckpoint: false });
      }
    });
    this._makeButton(W / 2, 656, 'LEVEL SELECT', () => {
      AudioSystem.play('menuBack');
      this.scene.start(SCENES.LEVEL_SELECT);
    });

    // Confetti-style particles
    if (!this.textures.exists('particle-pixel')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4);
      g.generateTexture('particle-pixel', 4, 4); g.destroy();
    }
    this.add.particles(W / 2, 80, 'particle-pixel', {
      speed: { min: 80, max: 240 },
      angle: { min: 200, max: 340 },
      gravityY: 200,
      lifespan: 2000,
      frequency: 80,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [COLORS.coin, COLORS.shadowBright, 0xffffff, COLORS.good],
      duration: 1500,
    });
  }

  _fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
