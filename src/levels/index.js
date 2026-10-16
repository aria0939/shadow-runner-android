// src/levels/index.js
// Aggregates all level data into a single map by id.
// Each level exports:
//   width, height       — grid dimensions (in tiles)
//   spawn               — { x, y } in world pixels
//   exit (optional)     — embedded in layout via 'X'
//   layout              — array of strings, each char = one tile (64px square)
//   enemies             — array of { type, x, y, opts? }
//   boss                — { x, y } only for level 5
//   bossTriggerX        — world x where boss intro begins (level 5)

import level01 from './level01.js';
import level02 from './level02.js';
import level03 from './level03.js';
import level04 from './level04.js';
import level05 from './level05.js';

export default {
  1: level01,
  2: level02,
  3: level03,
  4: level04,
  5: level05,
};
