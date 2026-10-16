// src/ui/MobileControls.js
// Thin wrapper that creates / owns the TouchControls instance for GameScene.
// Re-creates on settings change so opacity/size can be tuned live.

import TouchControls from '../systems/TouchControls.js';

export default class MobileControls {
  constructor(scene, inputSystem) {
    this.scene = scene;
    this.input = inputSystem;
    this.tc = new TouchControls(scene, inputSystem);
  }
  destroy() {
    this.tc?.destroy();
  }
}
