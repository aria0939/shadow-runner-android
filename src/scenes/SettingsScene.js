// src/scenes/SettingsScene.js
// Settings: master/music/sfx volume, mute, screen shake, touch opacity/size.
// Persists via SaveSystem.

import Phaser from 'phaser';
import { SCENES, COLORS, SETTINGS_DEFAULTS } from '../config/constants.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() { super(SCENES.SETTINGS); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x05060a).setOrigin(0);

    this.add.text(W / 2, 80, 'SETTINGS', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '36px',
      color: '#e7e7ef',
      stroke: '#6a4cff',
      strokeThickness: 4,
    }).setOrigin(0.5).setLetterSpacing(8);

    const s = SaveSystem.getSettings();
    let y = 160;
    const rowH = 56;

    this._slider(W / 2, y, 'MASTER VOLUME', s.masterVolume, (v) => this._set({ masterVolume: v })); y += rowH;
    this._slider(W / 2, y, 'MUSIC VOLUME',  s.musicVolume,  (v) => this._set({ musicVolume: v }));  y += rowH;
    this._slider(W / 2, y, 'SFX VOLUME',    s.sfxVolume,    (v) => this._set({ sfxVolume: v }));    y += rowH;
    this._toggle(W / 2, y, 'MUTE',          s.muted,        (v) => this._set({ muted: v }));        y += rowH;
    this._slider(W / 2, y, 'SCREEN SHAKE',  s.screenShake,  (v) => this._set({ screenShake: v })); y += rowH;
    this._slider(W / 2, y, 'TOUCH OPACITY', s.touchOpacity, (v) => this._set({ touchOpacity: v })); y += rowH;
    this._slider(W / 2, y, 'TOUCH SIZE',    s.touchSize,    (v) => this._set({ touchSize: v }));    y += rowH;

    // Back button
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
      // Determine which scene launched us
      const gameActive = this.scene.isActive(SCENES.GAME);
      const pauseActive = this.scene.isActive(SCENES.PAUSE);
      this.scene.stop();
      if (pauseActive) this.scene.resume(SCENES.PAUSE);
      else if (gameActive) this.scene.resume(SCENES.GAME);
      else this.scene.start(SCENES.MAIN_MENU);
    });

    // Reset to defaults
    const r = this.add.text(W - 60, 40, 'RESET', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px',
      color: '#8a8aa8',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    r.on('pointerdown', () => {
      SaveSystem.updateSettings({ ...SETTINGS_DEFAULTS });
      AudioSystem.applyVolumes();
      this.scene.restart();
    });
  }

  _set(patch) {
    SaveSystem.updateSettings(patch);
    AudioSystem.applyVolumes();
  }

  _slider(cx, cy, label, value, onChange) {
    this.add.text(cx - 200, cy, label, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '15px',
      color: '#8a8aa8',
    }).setOrigin(0, 0.5).setLetterSpacing(2);
    const track = this.add.rectangle(cx + 60, cy, 240, 6, 0x14162a).setStrokeStyle(1, 0x2a2a40);
    const knob = this.add.circle(cx + 60 + (value - 0.5) * 240, cy, 12, COLORS.shadowBright)
      .setStrokeStyle(2, 0x05060a);
    const valTxt = this.add.text(cx + 200, cy, String(Math.round(value * 100)) + '%', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '13px',
      color: '#b8b8d0',
    }).setOrigin(0, 0.5);

    track.setInteractive({ useHandCursor: true });
    let dragging = false;
    const update = (pointer) => {
      const r = track.getBounds();
      let t = (pointer.x - r.left) / r.width;
      t = Phaser.Math.Clamp(t, 0, 1);
      knob.x = r.left + t * r.width;
      valTxt.setText(String(Math.round(t * 100)) + '%');
      onChange(t);
    };
    track.on('pointerdown', (p) => { dragging = true; update(p); });
    this.input.on('pointermove', (p) => { if (dragging) update(p); });
    this.input.on('pointerup',   ()  => { dragging = false; });
  }

  _toggle(cx, cy, label, value, onChange) {
    this.add.text(cx - 200, cy, label, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '15px',
      color: '#8a8aa8',
    }).setOrigin(0, 0.5).setLetterSpacing(2);
    const knob = this.add.text(cx + 60, cy, value ? 'ON' : 'OFF', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '15px',
      color: value ? COLORS.good : '#5a5a78',
      stroke: '#05060a',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    knob.on('pointerdown', () => {
      const v = !value; value = v;
      knob.setText(v ? 'ON' : 'OFF').setColor(v ? COLORS.good : '#5a5a78');
      onChange(v);
    });
  }
}
