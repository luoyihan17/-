import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { importProject, parseProjectArchive, MAX_ARCHIVE_BYTES } from '../src/lib/importProject.js';

const defaults = {
  text: 'Default', color: '#ddd0ff', highlightColor: '#8b5cf6', underlayColor: '#ddd0ff',
  glowColor: '#8b5cf6', fallSpeed: 90, glow: true, textSparkleShape: 'linear',
  trailLength: 120, textParticleDensity: 1, waterfallStyle: 'curtain',
};
const saved = { name: '已保存的光', settings: { ...defaults, text: '流动的光\nThree.js', fallSpeed: 170 }, renderer: 'three', fixedCanvas: true, paused: true };
const archive = (preset, path = 'src/initial-preset.json', extra = {}) => zipSync({ [path]: strToU8(JSON.stringify(preset)), ...extra });

test('restores the exported state and does not run bundled JavaScript', () => {
  const p = parseProjectArchive(archive(saved, 'src/initial-preset.json', { 'src/main.js': strToU8('throw new Error("DO NOT RUN")') }), defaults);
  assert.equal(p.settings.text, saved.settings.text);
  assert.equal(p.settings.fallSpeed, 170);
  assert.equal(p.renderer, 'three'); assert.equal(p.fixedCanvas, true); assert.equal(p.paused, true);
});
test('accepts a containing project folder and ignores macOS metadata', () => {
  const p = parseProjectArchive(archive(saved, 'my-project/src/initial-preset.json', { '__MACOSX/src/initial-preset.json': strToU8('junk') }), defaults);
  assert.equal(p.name, saved.name);
});
test('older packages inherit missing defaults and use Canvas 2D', () => {
  const p = parseProjectArchive(archive({ settings: { text: '', color: '#123456', highlightColor: '#abcdef' } }), defaults);
  assert.equal(p.settings.text, ''); assert.equal(p.settings.underlayColor, '#123456');
  assert.equal(p.settings.glowColor, '#abcdef'); assert.equal(p.settings.fallSpeed, 90);
  assert.equal(p.renderer, 'canvas'); assert.equal(p.paused, false);
});
test('rejects corrupt, unrelated, ambiguous and oversized presets', () => {
  assert.throws(() => parseProjectArchive(strToU8('not a zip'), defaults), /无法读取/);
  assert.throws(() => parseProjectArchive(zipSync({ 'index.html': strToU8('hello') }), defaults), /未找到/);
  assert.throws(() => parseProjectArchive(archive(saved, 'a/src/initial-preset.json', { 'b/src/initial-preset.json': strToU8(JSON.stringify(saved)) }), defaults), /多个项目/);
  assert.throws(() => parseProjectArchive(zipSync({ 'src/initial-preset.json': new Uint8Array(129 * 1024) }), defaults), /参数文件过大/);
  assert.throws(() => parseProjectArchive(zipSync({ 'src/initial-preset.json': strToU8('{broken') }), defaults), /有效的 JSON/);
  assert.throws(() => parseProjectArchive(archive(null), defaults), /没有有效/);
});
test('rejects invalid known parameters and drops unknown properties', () => {
  for (const patch of [{ fallSpeed: 10000 }, { glow: 'yes' }, { color: 'url(attack)' }, { text: 'a'.repeat(401) }, { textSparkleShape: 'unknown' }]) {
    assert.throws(() => parseProjectArchive(archive({ ...saved, settings: { ...saved.settings, ...patch } }), defaults), /参数/);
  }
  assert.throws(() => parseProjectArchive(archive({ ...saved, renderer: 'other' }), defaults), /渲染器/);
  assert.throws(() => parseProjectArchive(archive({ ...saved, paused: 'false' }), defaults), /状态/);
  const p = parseProjectArchive(archive({ ...saved, settings: { ...saved.settings, dangerous: 'unused', textSparkleShape: 'random' } }), defaults);
  assert.equal(p.settings.dangerous, undefined); assert.equal(p.settings.textSparkleShape, 'random');
});
test('file uploads enforce extension/size and read a valid ZIP', async () => {
  const p = await importProject(new File([archive(saved)], 'effect.ZIP'), defaults);
  assert.equal(p.renderer, 'three');
  await assert.rejects(importProject(new File(['x'], 'effect.txt'), defaults), /zip/);
  await assert.rejects(importProject({ name: 'large.zip', size: MAX_ARCHIVE_BYTES + 1, arrayBuffer: () => { throw new Error('must not read'); } }, defaults), /20 MB/);
});
