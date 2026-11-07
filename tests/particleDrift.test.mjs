import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDriftClearance } from '../src/lib/particleDrift.js';
test('safe drift stays inside irregular strokes, including holes and canvas edges', () => {
  const width = 24, height = 20;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!(x > 8 && x < 14 && y > 5 && y < 13) && !(x < 4 && y > 10)) pixels[(y * width + x) * 4 + 3] = 255;
  }
  const clearance = buildDriftClearance(pixels, width, height);
  assert.ok(clearance.some(d => d > 2));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!clearance[y * width + x]) continue;
    const r = Math.min(5, Math.max(0, clearance[y * width + x] - 1));
    for (const fraction of [0.01, 0.99]) for (let step = 0; step < 60; step++) {
      const px = Math.floor(x + fraction + Math.sin(step) * r);
      const py = Math.floor(y + fraction + Math.cos(step * 0.73) * r);
      assert.ok(px >= 0 && px < width && py >= 0 && py < height);
      assert.equal(pixels[(py * width + px) * 4 + 3], 255);
    }
  }
});
