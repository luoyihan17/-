import { useState } from 'react';

const STORAGE_KEY = 'flowtype.parameter-presets.v1';
const labels = {
  nextText: '下一句歌词', lyricAuto: '自动切换歌词', lyricHold: '每句停留（秒）', lyricDuration: '切换时长（秒）', lyricAnimation: '切换动画',
  particleAlphaRandom: "文字粒子 Alpha 随机", particleAlphaVariation: "透明度随机幅度",
  particleLiveliness: "游动幅度", particleDriftSpeed: "游动速度", particleTwinkle: "文字粒子闪烁", particleTwinkleIntensity: "闪烁强度", particleTwinkleSpeed: "闪烁速度",
  particleShape: '粒子形态', particleSizeRandom: '粒子大小随机', particleSizeVariation: '大小随机幅度',
  textSparkleShape: '扫光形态',
  textSparkles: '文字扫光', textSparkleAmount: '扫光频率', textSparkleIntensity: '扫光亮度', textSparkleSpeed: '扫光速度', textSparkleSize: '光带宽度',
  text: '文字内容', waterfallStyle: '瀑布模式', connected: '文字与瀑布衔接',
  connectionStrength: '过渡强度', fallSpeed: '下落速度', emissionRate: '粒子生成量',
  waterfallAmount: '瀑布数量', trailLength: '拖尾长度', trailOpacity: '拖尾不透明度',
  trailColorMode: '拖尾颜色', trailAutoFade: '自动渐隐', particleSize: '粒子大小',
  textParticleDensity: '文字粒子密集度', color: '文字颜色', highlightColor: '粒子颜色',
  underlayDiffusion: '底色 Glow Diffusion', glowDiffusion: '光晕 Glow Diffusion', underlayColor: '底色颜色', glowColor: '光晕颜色', glow: '文字光晕', textUnderlay: '文字底色', brightSparkles: '明亮闪点',
};
const ranges = { lyricHold: [1, 15], lyricDuration: [0.2, 3], particleDriftSpeed: [0, 3], particleAlphaVariation: [0, 1], particleLiveliness: [0, 1], particleTwinkleIntensity: [0, 1], particleTwinkleSpeed: [0.2, 3], particleSizeVariation: [0, 1], textSparkleTurbulence: [0, 1], textSparkleScale: [10, 150], textSparkleFlow: [0, 3], textSparkleAmount: [0, 1], textSparkleIntensity: [0, 1], textSparkleSpeed: [0.2, 3], textSparkleSize: [0.5, 4], underlayDiffusion: [0, 40], glowDiffusion: [0, 40], connectionStrength: [0, 1], fallSpeed: [20, 220], emissionRate: [50, 1200], waterfallAmount: [0, 1], trailLength: [0, 240], trailOpacity: [0, 1], particleSize: [0.5, 4], textParticleDensity: [0.1, 12] };
const percentages = ['particleAlphaVariation', 'particleLiveliness', 'particleTwinkleIntensity', 'particleSizeVariation', 'textSparkleTurbulence', 'textSparkleAmount', 'textSparkleIntensity', 'connectionStrength', 'waterfallAmount', 'trailOpacity', 'textParticleDensity'];
function format(key, value) {
  if (percentages.includes(key)) return `${Math.round(value * 100)}%`;
  if (key === 'lyricAnimation') return { fade: '淡入淡出', slide: '向下滑动', none: '直接切换' }[value];
  if (key === 'particleShape') return { square: '方形', circle: '圆形', diamond: '菱形', star: '星形' }[value];
  if (typeof value === 'boolean') return value ? '开启' : '关闭';
  if (key === 'waterfallStyle') return value === 'classic' ? '细线瀑布' : '柔光瀑布';
  if (key === 'trailColorMode') return value === 'solid' ? '纯粒子色' : '渐变色';
  if (key === 'textSparkleSize') return `${Math.round(16 + value * 30)} px`;
  if (key === 'textSparkleShape') return { random: '随机爆闪', linear: '柔亮光带' }[value];
  if (key === 'textSparkleScale') return `${value} px`;
  if (key === 'textSparkleFlow') return `${value} ×`;
  if (key === 'textSparkleSpeed') return `${value} ×`;
  if (key === 'particleDriftSpeed') return `${value} ×`;
  if (key === 'fallSpeed') return `${value} px/s`;
  if (key === 'emissionRate') return `${value} /s`;
  if (['textSparkleSize', 'trailLength', 'particleSize', 'underlayDiffusion', 'glowDiffusion'].includes(key)) return `${value} px`;
  return value;
}
function validPreset(p, defaults) {
  if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !Number.isFinite(Date.parse(p.savedAt)) || typeof p.fixedCanvas !== 'boolean' || typeof p.paused !== 'boolean' || !p.settings) return false;
  if (p.renderer !== undefined && !['canvas', 'three'].includes(p.renderer)) return false;
  return Object.entries(defaults).every(([key, value]) => {
    if (p.settings[key] === undefined && ['nextText', 'lyricAuto', 'lyricHold', 'lyricDuration', 'lyricAnimation'].includes(key)) return true;
    const saved = p.settings[key];
    if (typeof saved !== typeof value) return false;
    if (ranges[key]) return Number.isFinite(saved) && saved >= ranges[key][0] && saved <= ranges[key][1];
    if (['color', 'highlightColor', 'underlayColor', 'glowColor'].includes(key)) return /^#[0-9a-f]{6}$/i.test(saved);
    if (key === 'waterfallStyle') return ['classic', 'curtain'].includes(saved);
    if (key === 'trailColorMode') return ['gradient', 'solid'].includes(saved);
    if (key === 'textSparkleShape') return ['linear', 'turbulence', 'random'].includes(saved);
    if (key === 'particleShape') return ['square', 'circle', 'diamond', 'star'].includes(saved);
    if (key === 'lyricAnimation') return ['fade', 'slide', 'none'].includes(saved);
    if (['text', 'nextText'].includes(key)) return saved.length <= 400;
    return true;
  });
}
function loadPresets(defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], error: '' };
    const data = JSON.parse(raw);
    if (Array.isArray(data.items)) data.items = data.items.map(p => ({ ...p, settings: { ...Object.fromEntries(Object.keys(defaults).filter(key => key.startsWith("particleAlpha") || key.startsWith("particleTwinkle") || (key === "particleLiveliness" || key === "particleDriftSpeed") || key.startsWith("textSparkle") || ["particleShape", "particleSizeRandom", "particleSizeVariation"].includes(key)).map(key => [key, defaults[key]])), ...p.settings, lyricAnimation: ['wipe', 'cinematic'].includes(p.settings?.lyricAnimation) ? 'fade' : (p.settings?.lyricAnimation ?? defaults.lyricAnimation), textSparkleShape: p.settings?.textSparkleShape === 'turbulence' ? 'linear' : (p.settings?.textSparkleShape ?? defaults.textSparkleShape), underlayDiffusion: p.settings?.underlayDiffusion ?? defaults.underlayDiffusion, glowDiffusion: p.settings?.glowDiffusion ?? defaults.glowDiffusion, underlayColor: p.settings?.underlayColor ?? p.settings?.color, glowColor: p.settings?.glowColor ?? p.settings?.highlightColor } }));
    if (data.version !== 1 || !Array.isArray(data.items) || !data.items.every(p => validPreset(p, defaults))) throw new Error('invalid');
    return { items: data.items, error: '' };
  } catch {
    return { items: [], error: '无法读取浏览器中的保存记录。可以先导出当前参数备份；原存储不会自动清除。' };
  }
}
function developerJSON(preset) {
  return JSON.stringify({
    schemaVersion: 1, name: preset.name, savedAt: preset.savedAt,
    component: 'ParticleText',
    props: { mode: 'waterfall', ...preset.settings, renderer: preset.renderer || 'canvas', density: 4, fontWeight: 800,
      fontSize: preset.fixedCanvas ? 128 : 'clamp(3rem, 8vw, 6rem)',
      ...(preset.fixedCanvas ? { canvasWidth: 1356, canvasHeight: 932 } : {}),
      paused: preset.paused },
    preview: { fixedCanvas: preset.fixedCanvas, aspectRatio: preset.fixedCanvas ? '1356 / 932' : null },
  }, null, 2);
}
function download(preset) {
  const url = URL.createObjectURL(new Blob([developerJSON(preset)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `flowtype-${preset.name.replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 50) || 'preset'}.json`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function ParameterPresets({ settings, renderer = 'canvas', fixedCanvas, paused, defaults, onApply }) {
  const [initial] = useState(() => loadPresets(defaults));
  const [items, setItems] = useState(initial.items);
  const [name, setName] = useState('');
  const [message, setMessage] = useState(initial.error);
  const [openId, setOpenId] = useState(initial.items[0]?.id || '');
  const [deleteId, setDeleteId] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportSource = async preset => {
    setExporting(true);
    try {
      const { downloadProject } = await import('../lib/exportProject');
      downloadProject(preset);
      setMessage('已生成完整源码 ZIP，包含画板、组件、参数和运行示例。');
    } catch { setMessage('源码导出失败，请重试。'); }
    finally { setExporting(false); }
  };
  const snapshot = () => ({ id: crypto.randomUUID(), name: name.trim() || `参数 ${new Date().toLocaleString('zh-CN', { hour12: false })}`, savedAt: new Date().toISOString(), settings: { ...settings }, renderer, fixedCanvas, paused });
  const persist = (next, success) => {
    setItems(next);
    if (initial.error) { setMessage('当前记录仅保留在本次页面中，请导出 JSON 备份。浏览器原记录未覆盖。'); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: next })); setMessage(success); }
    catch { setMessage('浏览器存储不可用或空间不足，记录暂存在当前页面，请导出 JSON 备份。'); }
  };
  const save = event => {
    event.preventDefault();
    const preset = snapshot();
    persist([preset, ...items], `已保存「${preset.name}」`);
    setName(''); setOpenId(preset.id);
  };
  const copy = async preset => {
    try { await navigator.clipboard.writeText(developerJSON(preset)); setMessage(`已复制「${preset.name}」的 JSON`); }
    catch { setOpenId(preset.id); setMessage('无法访问剪贴板，请展开开发参数手动复制，或导出 JSON。'); }
  };
  return <section className="presets-panel" aria-label="参数预设">
    <div className="presets-heading"><div><h2>参数预设 <span>{items.length}</span></h2><p>保存每次调好的效果，随时对比与还原。</p></div><button type="button" onClick={() => download(snapshot())}>导出当前参数</button></div>
    <form className="preset-save" onSubmit={save}><input aria-label="预设名称" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="给这组参数起个名字（可选）"/><button type="submit">＋ 保存当前参数</button></form><button className="source-export" type="button" disabled={exporting} onClick={() => exportSource(snapshot())}>{exporting ? '正在打包…' : '导出当前画板完整源码 ZIP'}</button>
    <p className="presets-local-note">保存在当前浏览器，不会跨设备同步。JSON 仅包含参数；完整源码 ZIP 包含可运行画板与示例。</p>
    <p className="preset-status" role="status">{message}</p>
    {!items.length && <div className="presets-empty">还没有保存的参数<br/><span>调好效果后，点击「保存当前参数」留下一个版本。</span></div>}
    <div className="preset-list">{items.map(preset => <article className="preset-card" key={preset.id}>
      <div className="preset-card-heading"><div><h3>{preset.name}</h3><time dateTime={preset.savedAt}>{new Date(preset.savedAt).toLocaleString('zh-CN', { hour12: false })}</time></div><button type="button" onClick={() => { onApply(preset); setMessage(`已恢复「${preset.name}」的全部参数`); }}>恢复参数</button></div>
      <p className="preset-text">{preset.settings.text || '（空文案）'}</p>
      <p className="preset-summary">{format('waterfallStyle', preset.settings.waterfallStyle)} · {preset.fixedCanvas ? '1356 × 932' : '自适应画布'} · 速度 {preset.settings.fallSpeed} · 拖尾 {preset.settings.trailLength}px · 密集度 {Math.round(preset.settings.textParticleDensity * 100)}%</p>
      <details open={openId === preset.id} onToggle={e => { if (e.currentTarget.open && openId !== preset.id) setOpenId(preset.id); }}><summary onClick={e => { e.preventDefault(); setOpenId(openId === preset.id ? '' : preset.id); }}>查看全部参数</summary>
        <dl className="preset-values">{Object.entries(labels).filter(([key]) => key !== 'text').map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{format(key, preset.settings[key])}</dd></div>)}<div><dt>画布尺寸</dt><dd>{preset.fixedCanvas ? '1356 × 932' : '自适应'}</dd></div><div><dt>播放状态</dt><dd>{preset.paused ? '暂停' : '播放'}</dd></div></dl>
        <details className="preset-json"><summary>开发参数 JSON</summary><pre>{developerJSON(preset)}</pre></details>
      </details>
      <div className="preset-actions"><button type="button" onClick={() => copy(preset)}>复制 JSON</button><button type="button" onClick={() => download(preset)}>导出 JSON</button><button type="button" disabled={exporting} onClick={() => exportSource(preset)}>导出完整源码 ZIP</button>{deleteId === preset.id ? <><button type="button" className="preset-delete" onClick={() => { persist(items.filter(item => item.id !== preset.id), '已删除预设'); setDeleteId(''); }}>确认删除</button><button type="button" onClick={() => setDeleteId('')}>取消</button></> : <button type="button" className="preset-delete" onClick={() => setDeleteId(preset.id)}>删除</button>}</div>
    </article>)}</div>
  </section>;
}
