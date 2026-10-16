// src/ui/HUD.js
// Compact pixel-art-styled HUD. Shows health hearts, coins, score, shadow
// energy bar, level name. Optional power-up timer + boss health bar.

import Phaser from 'phaser';
import { COLORS, GAME } from '../config/constants.js';

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    const W = scene.scale.width, H = scene.scale.height;

    // Top-left: health hearts + coins + score
    this.hearts = [];
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 32;
      const h = scene.add.text(x, 26, '\u2665', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '28px',
        color: '#ff5d8f',
        stroke: '#05060a',
        strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(9500);
      this.hearts.push(h);
    }

    this.coinIcon = scene.add.text(30, 56, '\u25C9', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffd166',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(9500);
    this.coinText = scene.add.text(54, 56, '0', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e7e7ef',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(9500);

    this.scoreText = scene.add.text(30, 80, 'SCORE 0', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px',
      color: '#b8b8d0',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(9500).setLetterSpacing(2);

    // Top-center: level name
    this.levelText = scene.add.text(W / 2, 26, '', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px',
      color: '#b8b8d0',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(9500).setLetterSpacing(4);

    // Top-right: Shadow Energy bar
    const barW = 220, barH = 14;
    const barX = W - barW - 28, barY = 24;
    this.energyBg = scene.add.graphics().setScrollFactor(0).setDepth(9500);
    this.energyBg.fillStyle(0x111122, 1);
    this.energyBg.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    this.energyBg.fillStyle(0x1a1a30, 1);
    this.energyBg.fillRect(barX, barY, barW, barH);
    this.energyFill = scene.add.graphics().setScrollFactor(0).setDepth(9501);

    this.energyLabel = scene.add.text(barX + barW / 2, barY - 16, 'SHADOW ENERGY', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '10px',
      color: '#b8b8d0',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9500).setLetterSpacing(3);

    // Toast (transient message)
    this.toast = scene.add.text(W / 2, 110, '', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '20px',
      color: '#e7e7ef',
      stroke: '#05060a',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9502).setAlpha(0).setLetterSpacing(4);

    // Damage flash overlay
    this.damageFlash = scene.add.rectangle(0, 0, W, H, 0xff4d6d, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(9499);

    // Boss bar (hidden by default)
    this.bossBarBg = scene.add.graphics().setScrollFactor(0).setDepth(9503).setVisible(false);
    this.bossBarFill = scene.add.graphics().setScrollFactor(0).setDepth(9504).setVisible(false);
    this.bossName = scene.add.text(W / 2, H - 36, '', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px',
      color: '#ff8080',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9505).setVisible(false).setLetterSpacing(6);

    // Power-up timer (small chips near bottom center)
    this.powerupChips = {};
  }

  setHealth(hp) {
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setAlpha(i < hp ? 1 : 0.18);
    }
  }

  setCoins(n) {
    this.coinText.setText(String(n));
  }

  setScore(n) {
    this.scoreText.setText('SCORE ' + String(n));
  }

  setLevelName(name) {
    this.levelText.setText(name);
  }

  setShadowEnergy(ratio) {
    const W = this.scene.scale.width;
    const barW = 220, barH = 14;
    const barX = W - barW - 28, barY = 24;
    this.energyFill.clear();
    this.energyFill.fillStyle(COLORS.shadow, 1);
    this.energyFill.fillRect(barX, barY, barW * Phaser.Math.Clamp(ratio, 0, 1), barH);
    this.energyFill.fillStyle(COLORS.shadowBright, 1);
    this.energyFill.fillRect(barX + barW * Phaser.Math.Clamp(ratio, 0, 1) - 3, barY, 3, barH);
  }

  setLives(n) {
    // Could display lives separately; we fold into score for now.
  }

  showToast(text, dur = 1400) {
    this.toast.setText(text);
    this.toast.setAlpha(0);
    this.scene.tweens.killTweensOf(this.toast);
    this.scene.tweens.add({
      targets: this.toast,
      alpha: 1,
      duration: 180,
      yoyo: true,
      hold: dur,
      onComplete: () => this.toast.setAlpha(0),
    });
  }

  flashDamage() {
    this.damageFlash.setAlpha(0.4);
    this.scene.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: 250,
    });
  }

  showBossBar(name) {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const barW = 540, barH = 14;
    const barX = (W - barW) / 2, barY = H - 56;
    this.bossBarBg.clear();
    this.bossBarBg.fillStyle(0x111122, 1);
    this.bossBarBg.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    this.bossBarBg.fillStyle(0x2a0a14, 1);
    this.bossBarBg.fillRect(barX, barY, barW, barH);
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossName.setText(name).setVisible(true);
    this.setBossHealth(1);
  }

  setBossHealth(ratio) {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const barW = 540, barH = 14;
    const barX = (W - barW) / 2, barY = H - 56;
    this.bossBarFill.clear();
    this.bossBarFill.fillStyle(COLORS.hazard, 1);
    this.bossBarFill.fillRect(barX, barY, barW * Phaser.Math.Clamp(ratio, 0, 1), barH);
  }

  hideBossBar() {
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossName.setVisible(false);
  }

  setPowerup(name, remainingMs) {
    if (!this.powerupChips[name]) {
      const W = this.scene.scale.width;
      const i = Object.keys(this.powerupChips).length;
      const chip = this.scene.add.text(W / 2 - 60 + i * 90, 130, '', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '11px',
        color: '#b5a3ff',
        stroke: '#05060a',
        strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(9502).setLetterSpacing(2);
      this.powerupChips[name] = chip;
    }
    this.powerupChips[name].setText(`${name}  ${(remainingMs / 1000).toFixed(1)}s`);
    this.powerupChips[name].setAlpha(remainingMs > 0 ? 1 : 0);
  }

  destroy() {
    // Let scene cleanup handle it.
  }
}
