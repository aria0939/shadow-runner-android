// src/scenes/CreditsScene.js
// End credits / about. Auto-advances back to main menu after a delay.

import Phaser from 'phaser';
import { SCENES, COLORS } from '../config/constants.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class CreditsScene extends Phaser.Scene {
  constructor() { super(SCENES.CREDITS); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    AudioSystem.playMusic('victory');
    this.add.rectangle(0, 0, W, H, 0x05060a).setOrigin(0);

    this.add.text(W / 2, 100, 'SHADOW RUNNER', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '44px',
      color: '#e7e7ef',
      stroke: '#6a4cff',
      strokeThickness: 6,
    }).setOrigin(0.5).setLetterSpacing(8);

    this.add.text(W / 2, 156, 'PIXEL ADVENTURE', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px',
      color: '#b5a3ff',
    }).setOrigin(0.5).setLetterSpacing(10);

    const credits = [
      '',
      'DESIGN  ·  CODE  ·  ART INTEGRATION',
      'Aria0939',
      '',
      'TECH STACK',
      'Phaser 3  ·  Vite  ·  Capacitor  ·  Android Gradle',
      '',
      'ORIGINAL ASSET PACK',
      'Hero  ·  Enemies  ·  Tiles  ·  Pickups  ·  Background',
      '',
      'AUDIO',
      'Procedural WebAudio engine — original SFX and music',
      '',
      'THANK YOU FOR PLAYING',
      '',
      'The shadows are at rest — for now.',
    ];
    const txt = this.add.text(W / 2, H + 40, credits, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px',
      color: '#b8b8d0',
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5, 0).setLetterSpacing(3);

    this.tweens.add({
      targets: txt,
      y: -txt.height - 40,
      duration: 18000,
      ease: 'Linear',
      onComplete: () => this._toMenu(),
    });

    // Skip on tap
    this.input.once('pointerdown', () => this._toMenu());
  }

  _toMenu() {
    AudioSystem.stopMusic();
    this.scene.start(SCENES.MAIN_MENU);
  }
}
