// src/scenes/LevelSelectScene.js
// Shows 5 level cards. Locked levels are dimmed and unclickable.
// Completion state (fragments / best time) is shown on completed cards.

import Phaser from 'phaser';
import { SCENES, COLORS, LEVELS } from '../config/constants.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super(SCENES.LEVEL_SELECT); }

  create() {
    AudioSystem.init();
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x05060a).setOrigin(0);

    this.add.text(W / 2, 70, 'LEVEL SELECT', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '36px',
      color: '#e7e7ef',
      stroke: '#6a4cff',
      strokeThickness: 4,
    }).setOrigin(0.5).setLetterSpacing(8);

    // Five cards in a row
    const cardW = 180, cardH = 260, gap = 24;
    const totalW = 5 * cardW + 4 * gap;
    const startX = (W - totalW) / 2 + cardW / 2;
    const y = H / 2 + 20;
    const save = SaveSystem.get();
    for (let i = 0; i < LEVELS.length; i++) {
      const lvl = LEVELS[i];
      const x = startX + i * (cardW + gap);
      const unlocked = SaveSystem.isUnlocked(lvl.id);
      const completed = save.completed[lvl.id];
      this._makeCard(x, y, cardW, cardH, lvl, unlocked, completed);
    }

    // Back button
    this._backButton();
  }

  _makeCard(x, y, w, h, lvl, unlocked, completed) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, unlocked ? 0x14162a : 0x08080f, 0.9)
      .setStrokeStyle(2, unlocked ? COLORS.shadowBright : 0x2a2a40);
    c.add(bg);

    const title = this.add.text(0, -h / 2 + 36, `${lvl.id}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '48px',
      color: unlocked ? '#e7e7ef' : '#3a3a50',
      stroke: '#05060a',
      strokeThickness: 4,
    }).setOrigin(0.5);
    c.add(title);

    const name = this.add.text(0, -h / 2 + 90, lvl.name.toUpperCase(), {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px',
      color: unlocked ? '#b8b8d0' : '#3a3a50',
    }).setOrigin(0.5).setLetterSpacing(2);
    c.add(name);

    const sub = this.add.text(0, -h / 2 + 116, lvl.subtitle, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px',
      color: unlocked ? '#7a7a98' : '#2a2a40',
      wordWrap: { width: w - 16 },
      align: 'center',
    }).setOrigin(0.5);
    c.add(sub);

    // Fragments / time / status
    let statusText;
    if (!unlocked) {
      statusText = '\u25A0 LOCKED';
    } else if (completed) {
      const f = completed.fragments || 0;
      statusText = `${'★'.repeat(f)}${'☆'.repeat(3 - f)}\nBEST  ${this._fmtTime(completed.bestTime)}`;
    } else {
      statusText = 'AVAILABLE';
    }
    const status = this.add.text(0, h / 2 - 50, statusText, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px',
      color: unlocked ? (completed ? '#ffd166' : '#b5a3ff') : '#3a3a50',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5).setLetterSpacing(2);
    c.add(status);

    if (unlocked) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setScale(1.04); bg.setStrokeStyle(3, COLORS.shadowBright); });
      bg.on('pointerout',  () => { bg.setScale(1.0);  bg.setStrokeStyle(2, COLORS.shadowBright); });
      bg.on('pointerdown', () => {
        AudioSystem.play('menuSelect');
        SaveSystem.clearCheckpoint();
        this.tweens.add({
          targets: c, scale: 0.92, duration: 80, yoyo: true,
          onComplete: () => this.scene.start(SCENES.GAME, { levelId: lvl.id, fromCheckpoint: false }),
        });
      });
    }
  }

  _fmtTime(ms) {
    if (!ms) return '--:--';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  _backButton() {
    const W = this.scale.width, H = this.scale.height;
    const b = this.add.text(60, 40, '\u25C0 BACK', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px',
      color: '#b8b8d0',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setColor('#b5a3ff'));
    b.on('pointerout',  () => b.setColor('#b8b8d0'));
    b.on('pointerdown', () => {
      AudioSystem.play('menuBack');
      this.scene.start(SCENES.MAIN_MENU);
    });
  }
}
