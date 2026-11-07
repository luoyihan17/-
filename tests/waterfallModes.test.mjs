import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the actual frame function with drawing backends stubbed out. This
// catches disconnected dispatch/update calls, not just the effect helpers.
const source = readFileSync(new URL('../src/components/WaterfallText.jsx', import.meta.url), 'utf8');
const frame = source.slice(source.indexOf('    const draw = (dt = 0) => {'), source.indexOf('    const showBackend ='));
function runFrame(shape, { enabled = true, dt = 0.016, gpuActive = false } = {}) {
  const calls = [];
  const p = { textSparkleShape: shape, textSparkles: enabled, textSparkleIntensity: 1,
    particleDriftSpeed: 1, particleTwinkleSpeed: 1, textSparkleSpeed: 1, textSparkleFlow: 1,
    emissionRate: 0, connection: 0, textUnderlay: false, brightSparkles: false };
  const scope = { live: { current: p }, elapsed: 0, driftTime: 0, twinkleTime: 0, sparkleTime: 0, flowTime: 0,
    gpuActive, gpu: { begin() {}, render() {} }, ctx: { clearRect() {} }, width: 100, height: 100,
    points: [{}], glyphPoints: [], visibleGlyphs: [], visibleDensity: -1, cachedUnderlay: null, cachedGlow: null, drops: [], emission: 0, maxDrops: 2600,
    particleGroup: '', sparkleGroup: '', reduced: false, classic: true,
    updateSources() {}, prepareLayers() {}, prepareTextLayers() {}, randomDrop() {},
    updateBursts(dt, settings) { calls.push(['update', dt, settings.textSparkleShape]); },
    drawTextSweep(settings) { calls.push(['sweep', settings.textSparkleShape]); },
    drawRandomBursts() { calls.push(['burst']); } };
  vm.runInNewContext(`${frame}\ndraw(${dt});`, scope);
  return calls;
}
for (const gpuActive of [false, true]) {
  test(`mode dispatch and burst clock (${gpuActive ? 'WebGL' : 'Canvas'})`, () => {
    assert.deepEqual(runFrame('random', { gpuActive }), [['update', 0.016, 'random'], ['burst']]);
    for (const shape of ['linear', 'turbulence']) {
      assert.deepEqual(runFrame(shape, { gpuActive }), [['update', 0.016, shape], ['sweep', shape]]);
    }
    assert.deepEqual(runFrame('random', { enabled: false, gpuActive }), [['update', 0.016, 'random']]);
    assert.deepEqual(runFrame('random', { dt: 0, gpuActive }), [['update', 0, 'random'], ['burst']]);
  });
}

test('burst peak illuminates its glyph anchor, then expires', () => {
  const start = source.indexOf('    const drawRandomBursts = p => {');
  const end = source.indexOf('    // A moving soft-edged highlight', start);
  const pixels = new Uint8ClampedArray(32 * 32 * 4);
  const fakeContext = { putImageData() {}, clearRect() {}, drawImage() {} };
  const scope = {
    noiseLayer: { width: 32, height: 32, getContext: () => fakeContext },
    noisePixels: { data: pixels }, glyphMask: {}, sweepLayer: { getContext: () => fakeContext },
    width: 128, height: 128, sweepBounds: { top: 0, centerY: 64 },
    reduced: false, flowTime: 0, gpuActive: true, gpu: { layer() {} }, turbulence: () => 0.5,
    bursts: [{ x: 64, y: 64, age: 0.08, duration: 1, angle: 1.2, bend: 1, seed: 1, stretch: 0, size: 0 }],
    p: { textSparkleBurstRate: 2, textSparkleSize: 1.5, textSparkleSpeed: 3,
      textSparklePathRandom: 1, textSparkleShapeRandom: 1, textSparkleScale: 45, textSparkleIntensity: 1 },
  };
  vm.createContext(scope);
  vm.runInContext(source.slice(start, end) + '\ndrawRandomBursts(p);', scope);
  assert.equal(pixels[(16 * 32 + 16) * 4 + 3], 255, 'peak must reach the glyph anchor even at maximum travel speed');
  scope.bursts[0].age = 1;
  vm.runInContext('drawRandomBursts(p);', scope);
  assert.equal(pixels.filter((_, i) => i % 4 === 3).some(a => a > 0), false);
});
