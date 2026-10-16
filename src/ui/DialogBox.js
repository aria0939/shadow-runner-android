// src/ui/DialogBox.js
// Optional narrative / hint dialog. Bottom-of-screen text box that types
// out a message letter-by-letter, then auto-dismisses. Used sparingly
// (per spec: avoid large exposition).

import Phaser from 'phaser';
import { COLORS } from '../config/constants.js';

export default class DialogBox {
  constructor(scene) {
    this.scene = scene;
    const W = scene.scale.width, H = scene.scale.height;
    this.box = scene.add.graphics().setScrollFactor(0).setDepth(9400).setVisible(false);
    this.box.fillStyle(0x05060a, 0.85);
    this.box.fillRect(40, H - 140, W - 80, 100);
    this.box.lineStyle(2, COLORS.shadow, 1);
    this.box.strokeRect(40, H - 140, W - 80, 100);

    this.text = scene.add.text(60, H - 124, '', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e7e7ef',
      wordWrap: { width: W - 160 },
    }).setScrollFactor(0).setDepth(9401).setVisible(false);

    this.skip = scene.add.text(W - 60, H - 50, '[ tap to dismiss ]', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px',
      color: '#8a8aa8',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(9402).setVisible(false).setLetterSpacing(2);

    this.active = false;
  }

  show(message, dur = 3500) {
    this.box.setVisible(true);
    this.text.setVisible(true).setText('');
    this.skip.setVisible(true);
    this.active = true;
    // Type out
    let i = 0;
    const typer = this.scene.time.addEvent({
      delay: 22,
      loop: true,
      callback: () => {
        i++;
        this.text.setText(message.slice(0, i));
        if (i >= message.length) typer.remove();
      },
    });
    // Auto-dismiss
    this.scene.time.delayedCall(dur, () => this.hide());
    // Tap to dismiss
    this.skip.setInteractive().once('pointerdown', () => this.hide());
  }

  hide() {
    this.box.setVisible(false);
    this.text.setVisible(false);
    this.skip.setVisible(false).removeInteractive();
    this.active = false;
  }
}
