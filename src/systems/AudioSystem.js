// src/systems/AudioSystem.js
// Procedural audio engine — no external sound files. Generates SFX via
// WebAudio oscillators + noise buffers, plus a simple ambient music loop.
// All audio only starts after a user gesture (browser autoplay policy).

import SaveSystem from './SaveSystem.js';

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicNodes = [];
let currentTrack = null;
let noiseBuffer = null;

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    // Pre-build a noise buffer for percussive SFX
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    applyVolumes();
  } catch (e) {
    console.warn('AudioSystem: WebAudio unavailable', e);
    return null;
  }
  return ctx;
}

function applyVolumes() {
  const s = SaveSystem.getSettings();
  if (!masterGain) return;
  const muted = s.muted ? 0 : 1;
  masterGain.gain.value = s.masterVolume * muted;
  musicGain.gain.value = s.musicVolume;
  sfxGain.gain.value = s.sfxVolume;
}

function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.3, slideTo = null, attack = 0.005, release = 0.05 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.02);
}

function noise({ dur = 0.1, vol = 0.3, lowpass = 8000, highpass = 200 }) {
  if (!ctx || !noiseBuffer) return;
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lowpass;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = highpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ---- Music ----
const TRACKS = {
  menu:    { root: 130.81, scale: [0, 3, 5, 7, 10], bpm: 70,  color: 'soft' },
  level01: { root: 146.83, scale: [0, 2, 4, 7, 9],  bpm: 92,  color: 'soft' },
  level02: { root: 116.54, scale: [0, 1, 3, 6, 8],  bpm: 88,  color: 'dark' },
  level03: { root: 164.81, scale: [0, 2, 5, 7, 9],  bpm: 100, color: 'bright' },
  level04: { root: 110.00, scale: [0, 1, 5, 6, 7],  bpm: 110, color: 'dark' },
  level05: { root: 98.00,  scale: [0, 1, 3, 5, 7],  bpm: 120, color: 'dark' },
  victory: { root: 196.00, scale: [0, 4, 7, 11],    bpm: 96,  color: 'bright' },
};

function midiToFreq(root, semis) { return root * Math.pow(2, semis / 12); }

function startTrack(name) {
  if (!ctx) return;
  stopTrack();
  const t = TRACKS[name];
  if (!t) return;
  currentTrack = name;

  const beat = 60 / t.bpm;
  const bar = beat * 4;
  // Schedule a bass + arpeggio loop using setInterval for simplicity.
  let step = 0;
  const intervalId = setInterval(() => {
    if (!ctx) return;
    if (currentTrack !== name) return;
    const t0 = ctx.currentTime + 0.02;
    const i = step % t.scale.length;
    const oct = (step % 8 < 4) ? 0 : 12;
    const f = midiToFreq(t.root, t.scale[i] + oct);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = t.color === 'dark' ? 'sawtooth' : 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + beat * 0.9);
    osc.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0 + beat);
    // Bass note every 4 steps
    if (step % 4 === 0) {
      const bf = midiToFreq(t.root, -12);
      const bo = ctx.createOscillator();
      const bg = ctx.createGain();
      bo.type = 'sine';
      bo.frequency.value = bf;
      bg.gain.setValueAtTime(0, t0);
      bg.gain.linearRampToValueAtTime(0.16, t0 + 0.05);
      bg.gain.exponentialRampToValueAtTime(0.0001, t0 + bar * 0.95);
      bo.connect(bg); bg.connect(musicGain);
      bo.start(t0); bo.stop(t0 + bar);
    }
    step++;
  }, beat * 1000);
  musicNodes.push({ kind: 'interval', id: intervalId });
}

function stopTrack() {
  for (const n of musicNodes) {
    if (n.kind === 'interval') clearInterval(n.id);
    if (n.kind === 'osc')     try { n.node.stop(); } catch {}
  }
  musicNodes = [];
  currentTrack = null;
}

// ---- SFX catalogue ----
const SFX = {
  menuSelect:    () => tone({ freq: 660,  dur: 0.08, type: 'square',  vol: 0.18, slideTo: 880 }),
  menuBack:      () => tone({ freq: 440,  dur: 0.08, type: 'square',  vol: 0.18, slideTo: 330 }),
  jump:          () => tone({ freq: 380,  dur: 0.18, type: 'square',  vol: 0.18, slideTo: 720 }),
  land:          () => noise({ dur: 0.07, vol: 0.18, lowpass: 1600, highpass: 80 }),
  coin:          () => { tone({ freq: 988,  dur: 0.06, type: 'triangle', vol: 0.20 });
                          setTimeout(() => tone({ freq: 1319, dur: 0.10, type: 'triangle', vol: 0.20 }), 50); },
  dash:          () => { noise({ dur: 0.18, vol: 0.20, lowpass: 3200, highpass: 200 });
                          tone({ freq: 220, dur: 0.18, type: 'sawtooth', vol: 0.18, slideTo: 660 }); },
  damage:        () => { tone({ freq: 180, dur: 0.22, type: 'sawtooth', vol: 0.20, slideTo: 90 });
                          noise({ dur: 0.18, vol: 0.20, lowpass: 1200 }); },
  enemyDefeat:   () => { tone({ freq: 440, dur: 0.12, type: 'square', vol: 0.18, slideTo: 110 });
                          noise({ dur: 0.12, vol: 0.15, lowpass: 2000 }); },
  death:         () => { tone({ freq: 220, dur: 0.5, type: 'sawtooth', vol: 0.22, slideTo: 60 });
                          noise({ dur: 0.4, vol: 0.18, lowpass: 800 }); },
  powerUp:       () => { tone({ freq: 660, dur: 0.10, type: 'triangle', vol: 0.18, slideTo: 990 });
                          setTimeout(() => tone({ freq: 1320, dur: 0.14, type: 'triangle', vol: 0.18 }), 100); },
  checkpoint:    () => { tone({ freq: 523, dur: 0.10, type: 'triangle', vol: 0.20 });
                          setTimeout(() => tone({ freq: 784, dur: 0.18, type: 'triangle', vol: 0.20 }), 100); },
  levelComplete: () => { [523, 659, 784, 1047].forEach((f, i) =>
                          setTimeout(() => tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.22 }), i * 130)); },
  bossHit:       () => { noise({ dur: 0.10, vol: 0.20, lowpass: 2400 });
                          tone({ freq: 200, dur: 0.10, type: 'square', vol: 0.20, slideTo: 120 }); },
  bossPhase:     () => { tone({ freq: 110, dur: 0.5, type: 'sawtooth', vol: 0.22, slideTo: 220 });
                          noise({ dur: 0.4, vol: 0.18, lowpass: 1500 }); },
  bossDefeat:    () => { [523, 392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
                          setTimeout(() => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.22 }), i * 110)); },
};

export default {
  init() { ensureContext(); applyVolumes(); },
  resume() {
    // Called on user gesture. Resumes the AudioContext if suspended.
    if (!ctx) ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  },
  play(name) {
    if (!ctx) ensureContext();
    if (!ctx) return;
    if (SaveSystem.getSettings().muted) return;
    const fn = SFX[name];
    if (fn) fn();
  },
  playMusic(track) {
    if (!ctx) ensureContext();
    if (!ctx) return;
    startTrack(track);
  },
  stopMusic() { stopTrack(); },
  applyVolumes,
};
