import { unzipSync, strFromU8 } from 'fflate';

export const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const MAX_PRESET_BYTES = 128 * 1024;
const ranges = {
  lyricHold: [1, 15], lyricDuration: [0.2, 3],
  particleAlphaVariation: [0, 1],
  particleLiveliness: [0, 1], particleDriftSpeed: [0, 3], particleTwinkleIntensity: [0, 1], particleTwinkleSpeed: [0.2, 3],
  particleSizeVariation: [0, 1], textSparkleTurbulence: [0, 1], textSparkleScale: [10, 150],
  textSparkleFlow: [0, 3], textSparkleAmount: [0, 1], textSparkleIntensity: [0, 1],
  textSparkleSpeed: [0.2, 3], textSparkleSize: [0.5, 4], underlayDiffusion: [0, 40],
  glowDiffusion: [0, 40], connectionStrength: [0, 1], fallSpeed: [20, 220],
  emissionRate: [50, 1200], waterfallAmount: [0, 1], trailLength: [0, 240],
  backgroundStarCount: [0, 120],
  brightSparkleSize: [50, 300],
  backgroundGradientOpacity: [0, 100],
  backgroundGradientHeight: [10, 100],
  backgroundGradientAngle: [0, 360],
  trailOpacity: [0, 1], particleSize: [0.5, 4], textParticleDensity: [0.1, 12],
  textSparkleBurstRate: [0, 5], textSparkleBurstDuration: [80, 1000],
  textSparklePathRandom: [0, 1], textSparkleShapeRandom: [0, 1],
};
const choices = {
  lyricAnimation: ['fade', 'slide', 'none'],
  waterfallStyle: ['classic', 'curtain'], trailColorMode: ['gradient', 'solid'],
  textSparkleShape: ['linear', 'turbulence', 'random'], particleShape: ['square', 'circle', 'diamond', 'star'],
};
const optional = {
  particleShape: 'circle', particleSizeRandom: false, particleSizeVariation: 0.5,
  textSparkleBurstRate: 2, textSparkleBurstDuration: 240, textSparklePathRandom: 1, textSparkleShapeRandom: 0.75,
};
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function normalizeImportedPreset(value, defaults) {
  if (!isRecord(value) || !isRecord(value.settings) || typeof value.settings.text !== 'string') {
    throw new Error('代码包中没有有效的效果参数，请选择本站「导出完整源码 ZIP」生成的文件。');
  }
  const settings = {};
  // Copy only recognized values, never executable source or arbitrary props.
  for (const [key, fallback] of Object.entries({ ...defaults, ...optional })) {
    let saved = Object.hasOwn(value.settings, key) ? value.settings[key]
      : key === 'underlayColor' ? (value.settings.color ?? fallback)
        : key === 'glowColor' ? (value.settings.highlightColor ?? fallback) : fallback;
    if (key === 'lyricAnimation' && ['wipe', 'cinematic'].includes(saved)) saved = 'fade';
    const range = ranges[key];
    const valid = typeof saved === typeof fallback
      && (!range || (Number.isFinite(saved) && saved >= range[0] && saved <= range[1]))
      && (!choices[key] || choices[key].includes(saved))
      && (!['color', 'highlightColor', 'underlayColor', 'glowColor'].includes(key) || /^#[0-9a-f]{6}$/i.test(saved))
      && (!['text', 'nextText'].includes(key) || saved.length <= 400);
    if (!valid) throw new Error(`代码包中的参数「${key}」无效，当前画板未更改。`);
    settings[key] = key === 'textSparkleShape' && saved === 'turbulence' ? 'linear' : saved;
  }
  for (const key of ['fixedCanvas', 'paused']) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error(`代码包中的「${key}」状态无效。`);
  }
  if (value.renderer !== undefined && !['canvas', 'three'].includes(value.renderer)) {
    throw new Error('代码包中的渲染器类型不受支持。');
  }
  return {
    name: typeof value.name === 'string' ? value.name.slice(0, 60) : '',
    settings, fixedCanvas: value.fixedCanvas ?? false, paused: value.paused ?? false,
    renderer: value.renderer ?? 'canvas',
  };
}

export function parseProjectArchive(bytes, defaults) {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error('代码包不能超过 20 MB，请选择本站导出的源码 ZIP。');
  let files, candidates = 0, tooLarge = false;
  try {
    // Inspect every name but decompress only the small saved preset. Other ZIP
    // entries are never extracted to disk, imported as modules, or executed.
    files = unzipSync(bytes, { filter(entry) {
      const path = entry.name.replaceAll('\\', '/');
      if (path.startsWith('/') || path.split('/').some(part => part === '..' || part === '__MACOSX')) return false;
      if (!/(^|\/)src\/initial-preset\.json$/.test(path)) return false;
      candidates++;
      if (entry.originalSize > MAX_PRESET_BYTES) { tooLarge = true; return false; }
      return candidates === 1;
    } });
  } catch { throw new Error('无法读取这个 ZIP，文件可能已损坏或加密。请重新导出后再试。'); }
  if (tooLarge) throw new Error('代码包中的参数文件过大，无法导入。');
  if (candidates === 0) throw new Error('未找到 src/initial-preset.json，请选择之前从本站下载的完整源码 ZIP。');
  if (candidates !== 1) throw new Error('ZIP 中包含多个项目，请只上传一个画板的源码包。');
  let preset;
  try { preset = JSON.parse(strFromU8(Object.values(files)[0]).replace(/^\uFEFF/, '')); }
  catch { throw new Error('代码包中的参数文件不是有效的 JSON，当前画板未更改。'); }
  return normalizeImportedPreset(preset, defaults);
}

export async function importProject(file, defaults) {
  if (!/\.zip$/i.test(file.name)) throw new Error('请选择 .zip 格式的源码包。');
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('代码包不能超过 20 MB，请选择本站导出的源码 ZIP。');
  return parseProjectArchive(new Uint8Array(await file.arrayBuffer()), defaults);
}
