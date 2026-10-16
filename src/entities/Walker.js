// src/entities/Walker.js
// Basic patrol enemy. Walks left/right, turns at walls and ledges.
// Stompable.

import Enemy from './Enemy.js';

export default class Walker extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy-walker', 'walker-walk');
    this.body.setSize(120, 110);
    this.body.setOffset((this.width - 120) / 2, this.height - 110);
    this.speed = 70;
    this.maxHealth = 1;
    this.health = 1;
    this.ledgeDetect = true;
  }
}
