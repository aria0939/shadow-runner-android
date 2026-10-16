// src/systems/SaveSystem.js
// Persistent save/load using localStorage with a Capacitor Preferences
// abstraction fallback. Defaults are always merged to protect against
// malformed data.

import { SETTINGS_DEFAULTS } from '../config/constants.js';

const KEY = 'shadow-runner-save-v1';

const DEFAULT_SAVE = {
  version: 1,
  unlockedLevel: 1,         // highest unlocked level (1..5)
  completed: {},            // { levelId: { completed: bool, fragments: 0..3, bestTime: ms, bestScore: int } }
  totalCoins: 0,
  totalScore: 0,
  lives: 3,
  lastCheckpoint: null,     // { levelId, x, y, score, coins, health }
  settings: { ...SETTINGS_DEFAULTS },
};

let memoryStore = null; // in-memory cache

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function loadRaw() {
  // Try localStorage first (works on web + Android WebView).
  try {
    const s = localStorage.getItem(KEY);
    if (s) return s;
  } catch {}
  return null;
}

function saveRaw(s) {
  try { localStorage.setItem(KEY, s); return true; } catch { return false; }
}

function deepMerge(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override.slice() : base;
  if (typeof base === 'object' && base !== null) {
    const out = { ...base };
    for (const k in override) {
      if (typeof base[k] === 'object' && base[k] !== null && typeof override[k] === 'object') {
        out[k] = deepMerge(base[k], override[k]);
      } else if (override[k] !== undefined) {
        out[k] = override[k];
      }
    }
    return out;
  }
  return override;
}

export default {
  load() {
    const raw = loadRaw();
    if (!raw) {
      memoryStore = { ...DEFAULT_SAVE, completed: {} };
      return memoryStore;
    }
    const parsed = safeParse(raw);
    if (!parsed || typeof parsed !== 'object') {
      memoryStore = { ...DEFAULT_SAVE, completed: {} };
      return memoryStore;
    }
    memoryStore = deepMerge({ ...DEFAULT_SAVE, completed: {} }, parsed);
    return memoryStore;
  },

  save() {
    if (!memoryStore) memoryStore = this.load();
    saveRaw(JSON.stringify(memoryStore));
    return memoryStore;
  },

  get() {
    if (!memoryStore) this.load();
    return memoryStore;
  },

  reset() {
    memoryStore = { ...DEFAULT_SAVE, completed: {} };
    saveRaw(JSON.stringify(memoryStore));
    return memoryStore;
  },

  // ---- Progress ----
  unlockLevel(id) {
    const s = this.get();
    if (id > s.unlockedLevel) s.unlockedLevel = id;
    this.save();
  },

  isUnlocked(id) { return id <= this.get().unlockedLevel; },

  markCompleted(id, { fragments = 0, time = 0, score = 0 } = {}) {
    const s = this.get();
    const prev = s.completed[id] || { fragments: 0, bestTime: 0, bestScore: 0 };
    s.completed[id] = {
      completed: true,
      fragments: Math.max(prev.fragments || 0, fragments),
      bestTime:  prev.bestTime ? Math.min(prev.bestTime, time) : time,
      bestScore: Math.max(prev.bestScore || 0, score),
    };
    if (id < 5) this.unlockLevel(id + 1);
    this.save();
  },

  // ---- Checkpoint ----
  setCheckpoint(cp) {
    const s = this.get();
    s.lastCheckpoint = cp;
    this.save();
  },
  clearCheckpoint() {
    const s = this.get();
    s.lastCheckpoint = null;
    this.save();
  },
  getCheckpoint() { return this.get().lastCheckpoint; },

  // ---- Settings ----
  getSettings() { return this.get().settings; },
  updateSettings(patch) {
    const s = this.get();
    s.settings = { ...s.settings, ...patch };
    this.save();
    return s.settings;
  },
};
