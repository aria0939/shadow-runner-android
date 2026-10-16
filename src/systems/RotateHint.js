// src/systems/RotateHint.js
// Lightweight overlay controller: if the device is in portrait, show the
// "rotate your device" hint and pause gameplay; restore when landscape.

let overlay;
let onChangeCallback = null;

function isPortrait() {
  // Use aspect ratio to handle both mobile and desktop dev.
  return window.innerHeight > window.innerWidth;
}

function apply() {
  if (!overlay) return;
  if (isPortrait()) {
    overlay.style.display = 'flex';
    if (onChangeCallback) onChangeCallback(true);
  } else {
    overlay.style.display = 'none';
    if (onChangeCallback) onChangeCallback(false);
  }
}

export default {
  init() {
    overlay = document.getElementById('rotate-hint');
    if (!overlay) return;
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
  },
  onChange(cb) { onChangeCallback = cb; },
  isPortrait,
};
