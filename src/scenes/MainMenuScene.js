// src/scenes/MainMenuScene.js
// Title screen. Shows the game logo, animated background, and menu buttons.
// Continue is only enabled when save data exists with progress beyond level 1
// or a checkpoint.

import Phaser from 'phaser';
import { SCENES, COLORS, LEVELS, GAME } from '../config/constants.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super(SCENES.MAIN_MENU); }

  create() {
    AudioSystem.init();
    AudioSystem.playMusic('menu');
    const W = this.scale.width, H = this.scale.height;

    // Background: animated gradient + drifting shadow particles
    const bg = this.add.graphics();
    bg.fillStyle(0x05060a, 1); bg.fillRect(0, 0, W, H);
    bg.fillStyle(0x14162a, 1); bg.fillRect(0, 0, W, H * 0.45);
    bg.fillStyle(0x2a1f5e, 0.4); bg.fillRect(0, H * 0.4, W, H * 0.2);

    // Use the green-valley panorama as a moody distant backdrop
    if (this.textures.exists('bg-green-valley')) {
      this.add.image(W / 2, H / 2 + 40, 'bg-green-valley')
        .setAlpha(0.25)
        .setTint(0x6a4cff)
        .setDisplaySize(W * 1.4, H * 1.4);
    }

    // Drifting shadow particles
    if (!this.textures.exists('particle-pixel')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4);
      g.generateTexture('particle-pixel', 4, 4); g.destroy();
    }
    this.add.particles(W / 2, H / 2 + 100, 'particle-pixel', {
      speed: { min: 20, max: 60 },
      angle: { min: 60, max: 120 },
      lifespan: { min: 2000, max: 5000 },
      frequency: 200,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: [COLORS.shadow, COLORS.shadowBright, 0xffffff],
      advance: 1000,
    }).setDepth(5);

    // Title
    const titleY = 130;
    this.add.text(W / 2, titleY, 'SHADOW RUNNER', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '72px',
      color: '#e7e7ef',
      stroke: '#6a4cff',
      strokeThickness: 8,
    }).setOrigin(0.5).setLetterSpacing(12).setDepth(10);

    this.add.text(W / 2, titleY + 64, 'PIXEL ADVENTURE', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '24px',
      color: '#b5a3ff',
      stroke: '#05060a',
      strokeThickness: 4,
    }).setOrigin(0.5).setLetterSpacing(16).setDepth(10);

    // Subtle pulse on the title
    this.tweens.add({
      targets: this.children.list.filter((c) => c.type === 'Text' && c.y === titleY),
      scale: { from: 1, to: 1.02 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Menu buttons
    const save = SaveSystem.get();
    const hasContinue = !!save.lastCheckpoint || save.unlockedLevel > 1;

    const buttons = [
      { label: 'START GAME',       action: () => this._startNew(),                              enabled: true },
      { label: 'CONTINUE',         action: () => this._continue(),                              enabled: hasContinue },
      { label: 'LEVEL SELECT',     action: () => this.scene.start(SCENES.LEVEL_SELECT),        enabled: true },
      { label: 'HOW TO PLAY',      action: () => this._showHowTo(),                             enabled: true },
      { label: 'SETTINGS',         action: () => this.scene.start(SCENES.SETTINGS),            enabled: true },
      { label: 'CREDITS',          action: () => this.scene.start(SCENES.CREDITS),             enabled: true },
    ];

    let y = titleY + 150;
    for (const b of buttons) {
      this._makeButton(W / 2, y, b.label, b.action, b.enabled);
      y += 56;
    }

    // Version footer
    this.add.text(W - 16, H - 16, 'v1.0.0', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px',
      color: '#5a5a78',
    }).setOrigin(1, 1).setDepth(10);

    // Start audio on first user gesture (browser autoplay policy)
    this.input.once('pointerdown', () => AudioSystem.resume());
  }

  _makeButton(x, y, label, action, enabled = true) {
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '22px',
      color: enabled ? '#e7e7ef' : '#4a4a60',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0.5).setLetterSpacing(4).setDepth(10);

    if (!enabled) {
      txt.setAlpha(0.4);
      return;
    }
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerover', () => { txt.setScale(1.06); txt.setColor('#b5a3ff'); });
    txt.on('pointerout',  () => { txt.setScale(1.0);  txt.setColor('#e7e7ef'); });
    txt.on('pointerdown', () => {
      AudioSystem.play('menuSelect');
      // Visual feedback: quick scale-down then trigger action directly.
      // We do NOT wait for a tween to complete before transitioning scenes,
      // because the tween manager is destroyed when the scene shuts down,
      // which could cause the transition to never fire.
      this.tweens.add({ targets: txt, scale: 0.95, duration: 50, yoyo: true });
      // Call the action on the next tick so the visual feedback shows briefly.
      this.time.delayedCall(60, action);
    });
  }

  _startNew() {
    SaveSystem.clearCheckpoint();
    this.scene.start(SCENES.GAME, { levelId: 1, fromCheckpoint: false });
  }

  _continue() {
    const cp = SaveSystem.getCheckpoint();
    if (cp) {
      this.scene.start(SCENES.GAME, { levelId: cp.levelId, fromCheckpoint: true });
    } else {
      const save = SaveSystem.get();
      this.scene.start(SCENES.GAME, { levelId: save.unlockedLevel || 1, fromCheckpoint: false });
    }
  }

  _showHowTo() {
    const W = this.scale.width, H = this.scale.height;
    const overlay = this.add.rectangle(0, 0, W, H, 0x05060a, 0.92).setOrigin(0).setDepth(50);
    const lines = [
      'HOW TO PLAY',
      '',
      'Move         A / D          or  on-screen arrows',
      'Jump         Space / W      or  JUMP button',
      'Sprint       Shift          or  RUN button',
      'Crouch       S              or  CRCH button',
      'Shadow Dash  E              or  DASH button',
      'Pause        Esc            or  II button',
      'Restart      R',
      '',
      'Stomp enemies from above.',
      'Avoid side contact.',
      'Use Shadow Dash to break shadow blocks and dodge hazards.',
      'Find Shadow Fragments in each level for a perfect run.',
      '',
      'Tap anywhere to return',
    ];
    const txt = this.add.text(W / 2, H / 2, lines, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e7e7ef',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(51);
    overlay.setInteractive();
    overlay.once('pointerdown', () => { overlay.destroy(); txt.destroy(); });
  }
}
