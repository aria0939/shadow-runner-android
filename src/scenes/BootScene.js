// src/scenes/BootScene.js
// First scene. Generates the shared particle texture so any system that
// needs 'particle-pixel' (hazards, particles, ambient) can rely on it.
// Hands off to PreloadScene.

import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }

  create() {
    this.cameras.main.setBackgroundColor('#05060a');

    // Generate a 4x4 white pixel texture used by particles and hazards.
    if (!this.textures.exists('particle-pixel')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('particle-pixel', 4, 4);
      g.destroy();
    }

    this.scene.start(SCENES.PRELOAD);
  }
}
