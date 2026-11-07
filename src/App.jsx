import { useState } from 'react';
import useLyrics from './lib/useLyrics';
import initialPreset from './initial-preset.json';
import ParticleText from './components/ParticleText';
import ParameterPresets from './components/ParameterPresets';
import ProjectImport from './components/ProjectImport';

const defaults = {
  nextText: "I love music so much\nPlease come to my mind", lyricAuto: false, lyricHold: 4, lyricDuration: 0.8, lyricAnimation: 'fade',
  particleAlphaRandom: true, particleAlphaVariation: 0.6,
  particleLiveliness: 0.55, particleDriftSpeed: 1, particleTwinkle: true, particleTwinkleIntensity: 0.8, particleTwinkleSpeed: 1,
  particleShape: 'circle', particleSizeRandom: false, particleSizeVariation: 0.5,
  text: "But I guess that's just\nthe way the story goes",
  waterfallStyle: 'curtain', connected: true, connectionStrength: 1, fallSpeed: 90, emissionRate: 500, waterfallAmount: 1, trailLength: 120, trailOpacity: 1, trailColorMode: 'gradient', trailAutoFade: true, particleSize: 2, textParticleDensity: 1,
  color: '#ddd0ff', highlightColor: '#8b5cf6', underlayColor: '#ddd0ff', glowColor: '#8b5cf6', underlayDiffusion: 9, glowDiffusion: 4, glow: true, textUnderlay: true, backgroundGradientOpacity: 25, backgroundGradientHeight: 50, backgroundGradientAngle: 180, brightSparkles: true, brightSparkleSize: 100, backgroundStarCount: 36,
  textSparkleShape: 'linear',
  textSparkles: true, textSparkleAmount: 0.45, textSparkleIntensity: 0.8, textSparkleSpeed: 1, textSparkleSize: 1.5,
};
function Icon({ name, size = 18 }) {
  const paths = {
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></>,
    sliders: <><path d="M4 7h5m4 0h7M4 17h10m4 0h2"/><circle cx="11" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>,
    arrow: <path d="M5 19 19 5M5 5h14v14" />,
    sparkle: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Slider({ label, note, value, min, max, step = 1, unit, onChange, disabled = false }) {
  return <label className={`slider-field ${disabled ? 'is-disabled' : ''}`}><span className="field-heading"><span>{label}<small>{note}</small></span><output>{value}<em>{unit}</em></output></span>
    <input type="range" disabled={disabled} aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--progress': `${(value - min) / (max - min) * 100}%` }} />
  </label>;
}
function rgba(hex, alpha) {
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
}
export default function App() {
  const [storedSettings, setSettings] = useState(() => ({ ...defaults, ...initialPreset?.settings }));
  const settings = { ...defaults, ...storedSettings, lyricAnimation: ['fade', 'slide', 'none'].includes(storedSettings.lyricAnimation) ? storedSettings.lyricAnimation : 'fade', textSparkleShape: storedSettings.textSparkleShape === 'turbulence' ? 'linear' : (storedSettings.textSparkleShape ?? defaults.textSparkleShape) };
  delete settings.textSparkleTurbulence;
  const [paused, setPaused] = useState(initialPreset?.paused ?? false);
  const lyrics = useLyrics(settings, paused);
  const [fixedCanvas, setFixedCanvas] = useState(initialPreset?.fixedCanvas ?? false);
  const [renderer, setRenderer] = useState(initialPreset?.renderer === 'three' ? 'three' : 'canvas');
  const [rendererStatus, setRendererStatus] = useState('canvas');
  const [rendererError, setRendererError] = useState('');
  const handleRendererStatus = (status, reason) => {
    if (status === 'error') {
      setRenderer('canvas'); setRendererStatus('canvas');
      setRendererError(/WebGL context|creating.*context/i.test(reason || '')
        ? '当前浏览器无法启用 WebGL，已切回 Canvas 2D。请在支持 WebGL 的外部浏览器中打开，或检查浏览器的图形加速设置。'
        : `Three.js 启用失败，已切回 Canvas 2D：${reason || '未知错误，请刷新后重试。'}`);
    } else setRendererStatus(status);
  };
  const toggleRenderer = () => {
    setRendererError('');
    setRenderer(value => value === 'three' ? 'canvas' : 'three');
  };
  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  const reset = () => { setSettings({ ...defaults }); setPaused(false); };
  const applyPreset = preset => {
    setSettings({ ...preset.settings }); setFixedCanvas(preset.fixedCanvas); setPaused(preset.paused);
    if (preset.renderer) { setRenderer(preset.renderer); setRendererError(''); }
  };
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="./" aria-label="sakura.ai制作 首页"><span className="brand-mark"><i/><i/><i/><i/></span>sakura.ai制作</a><span className="header-divider"/><span className="header-label">文字粒子实验室</span><div className="header-actions"><button className="renderer-toggle" type="button" onClick={toggleRenderer} disabled={rendererStatus === 'loading'} aria-pressed={rendererStatus === 'three'} aria-busy={rendererStatus === 'loading'}><Icon name={rendererStatus === 'three' ? 'reset' : 'sparkle'} size={15}/>{rendererStatus === 'loading' ? '正在转译…' : rendererStatus === 'three' ? '返回 Canvas 2D' : 'Three.js 转译'}</button></div></header>
    <main>
      <div className="intro"><div><div className="eyebrow"><span/> EXPERIMENT 001 / PARTICLE TEXT</div><h1>让文字，流动起来<span>。</span></h1><p>每一个字，都是一场微小的流星雨。</p></div><div className="edition">INTERACTIVE PLAYGROUND<span>实时渲染 · 自由探索</span></div></div>
      <div className="workspace">
        <div className="preview-column">
        <ProjectImport defaults={defaults} onImport={applyPreset}/>
        <section className={`preview-panel ${fixedCanvas ? 'fixed-canvas-panel' : ''}`} aria-label="粒子瀑布预览">
          <div className="preview-top"><span className="preview-tag"><Icon name="sparkle" size={14}/> {settings.waterfallStyle === 'classic' ? '细线瀑布' : '柔光瀑布'}</span><div className="preview-status"><span className={`renderer-badge ${rendererStatus === 'three' ? 'is-three' : ''}`} role="status">{rendererStatus === 'loading' ? '正在转译…' : rendererStatus === 'three' ? 'THREE.JS' : 'CANVAS 2D'}</span><span className={`live-state ${paused ? 'is-paused' : ''}`}><i/>{paused ? '已暂停' : '实时预览'}</span></div></div>
          {rendererError && <p className="renderer-error" role="alert">{rendererError}</p>}
          <div className={`canvas-stage ${fixedCanvas ? 'fixed-canvas-stage' : ''}`}><div className="ambient" style={{ background: `linear-gradient(${settings.backgroundGradientAngle}deg, ${rgba(settings.glowColor, settings.backgroundGradientOpacity / 100)} 0%, ${rgba(settings.glowColor, 0)} ${settings.backgroundGradientHeight}%), radial-gradient(ellipse at 50% 54%, #4c1d791c, transparent 64%)` }}/><ParticleText mode="waterfall" {...settings} text={lyrics.text} style={lyrics.style} renderer={renderer} onRendererStatus={handleRendererStatus} density={4} fontWeight={800} fontSize={fixedCanvas ? 128 : "clamp(3rem, 8vw, 6rem)"} canvasWidth={fixedCanvas ? 1356 : undefined} canvasHeight={fixedCanvas ? 932 : undefined} paused={paused}/></div>
          <div className="preview-bottom"><button className="canvas-size-toggle" aria-pressed={fixedCanvas} onClick={() => setFixedCanvas(v => !v)}>{fixedCanvas ? '✓ 1356 × 932 · 已开启' : '开启固定尺寸 1356 × 932'}</button><button className="playback" onClick={() => setPaused(p => !p)} aria-label={paused ? '继续动画' : '暂停动画'}><Icon name={paused ? 'play' : 'pause'} size={14}/>{paused ? '继续播放' : '暂停动画'}</button></div>
        </section>
        <ParameterPresets settings={settings} renderer={renderer} fixedCanvas={fixedCanvas} paused={paused} defaults={defaults} onApply={applyPreset}/>
        </div>
        <aside className="controls"><div className="controls-title"><h2><Icon name="sliders" size={17}/>效果调节</h2><button className="reset" onClick={reset}><Icon name="reset" size={13}/>重置</button></div>
          <div className="controls-body">
            <fieldset className="mode-field"><legend>瀑布模式</legend><div className="mode-options">
              {[['classic', '细线瀑布'], ['curtain', '柔光瀑布']].map(([value, label]) => <label key={value} className="mode-option"><input type="radio" name="waterfallStyle" value={value} checked={settings.waterfallStyle === value} onChange={() => update('waterfallStyle', value)}/><span>{label}</span></label>)}
            </div><p>{settings.waterfallStyle === 'classic' ? '点阵文字 · 轻盈细线拖尾' : '细密文字 · 连续紫色光帘'}</p></fieldset>
            <label className="text-field"><span className="field-heading">文字内容<span className="muted">支持换行</span></span><textarea aria-label="文字内容" value={settings.text} onChange={e => update('text', e.target.value)} spellCheck="false" rows={3} maxLength={400}/></label>
            <label className="text-field"><span className="field-heading">下一句歌词<span className="muted">支持换行</span></span><textarea aria-label="下一句歌词" value={settings.nextText} onChange={e => update('nextText', e.target.value)} spellCheck="false" rows={3} maxLength={400}/></label>
            <div className="lyric-navigation"><button type="button" onClick={lyrics.switchLyric}>← 上一句</button><span role="status">第 {lyrics.index + 1} / 2 句</span><button type="button" onClick={lyrics.switchLyric}>下一句 →</button></div>
            <label className="glow-field"><span>自动切换歌词</span><input type="checkbox" role="switch" aria-label="自动切换歌词" checked={settings.lyricAuto} onChange={e => update('lyricAuto', e.target.checked)}/><span className="switch" aria-hidden="true"/></label>
            <div className="lyric-timing">
              <Slider label="每句停留" value={settings.lyricHold} min={1} max={15} step={0.5} unit="秒" disabled={!settings.lyricAuto} onChange={v => update('lyricHold', v)}/>
              <Slider label="切换动画时长" value={settings.lyricDuration} min={0.2} max={3} step={0.1} unit="秒" disabled={settings.lyricAnimation === 'none'} onChange={v => update('lyricDuration', v)}/>
            </div>
            <fieldset className="mode-field"><legend>切换动画 / ANIMATION</legend><div className="mode-options lyric-animations">
              {[['fade', '淡入淡出'], ['slide', '向下滑动'], ['none', '直接切换']].map(([value, label]) => <label key={value} className="mode-option"><input type="radio" name="lyricAnimation" value={value} checked={settings.lyricAnimation === value} onChange={() => update('lyricAnimation', value)}/><span>{label}</span></label>)}
            </div><p>{settings.lyricAnimation === 'slide' ? '当前歌词向下掉落消失，下一句在原位渐显。' : '时长越短，切换越快。暂停动画也会暂停自动轮播。'}</p></fieldset>
            <div className="section-caption">文字内部 / BLING BLING</div>
            <Slider label="游动幅度" value={Math.round(settings.particleLiveliness * 100)} min={0} max={100} unit="%" onChange={v => update('particleLiveliness', v / 100)}/>
            <Slider label="游动速度" value={settings.particleDriftSpeed} min={0} max={3} step={0.1} unit="×" onChange={v => update('particleDriftSpeed', v)}/>
            <p className="trail-options-hint">粒子在笔画内轻轻漂移；幅度为 0 时回到原位，速度为 0 时冻结游动。</p>
            <label className="glow-field"><span>文字粒子 Alpha 随机</span><input type="checkbox" role="switch" aria-label="文字粒子 Alpha 随机" checked={settings.particleAlphaRandom} onChange={e => update('particleAlphaRandom', e.target.checked)}/><span className="switch" aria-hidden="true"/></label>
            <Slider label="透明度随机幅度" value={Math.round(settings.particleAlphaVariation * 100)} min={0} max={100} unit="%" disabled={!settings.particleAlphaRandom} onChange={v => update('particleAlphaVariation', v / 100)}/>
            <p className="trail-options-hint">幅度越大，颗粒明暗差异越明显；0% 无额外随机衰减，100% 可从近乎透明到原亮度。</p>
            <label className="glow-field"><span>文字粒子闪烁</span><input type="checkbox" role="switch" aria-label="文字粒子闪烁" checked={settings.particleTwinkle} onChange={e => update('particleTwinkle', e.target.checked)}/><span className="switch" aria-hidden="true"/></label>
            <Slider label="闪烁强度" value={Math.round(settings.particleTwinkleIntensity * 100)} min={0} max={100} unit="%" disabled={!settings.particleTwinkle} onChange={v => update('particleTwinkleIntensity', v / 100)}/>
            <Slider label="闪烁速度" value={settings.particleTwinkleSpeed} min={0.2} max={3} step={0.1} unit="×" disabled={!settings.particleTwinkle} onChange={v => update('particleTwinkleSpeed', v)}/>
            <p className="trail-options-hint">每颗文字粒子独立亮起、淡下去；强度控制明暗反差，速度控制闪烁节奏。</p>
            <div className="section-caption">运动 / MOTION</div>
            <fieldset className="mode-field"><legend>文字与瀑布衔接</legend><div className="mode-options">
              {[[true, '连接'], [false, '不连接']].map(([value, label]) => <label key={label} className="mode-option"><input type="radio" name="connected" value={String(value)} checked={settings.connected === value} onChange={() => update('connected', value)}/><span>{label}</span></label>)}
            </div></fieldset>
            <Slider label="过渡强度" value={Math.round(settings.connectionStrength * 100)} min={0} max={100} unit="%" disabled={!settings.connected} onChange={v => update('connectionStrength', v / 100)}/>
            <Slider label="下落速度" note="" value={settings.fallSpeed} min={20} max={220} unit="px/s" onChange={v => update('fallSpeed', v)}/>
            <Slider label="瀑布数量" value={Math.round(settings.waterfallAmount * 100)} min={0} max={100} unit="%" onChange={v => update('waterfallAmount', v / 100)}/>
            <Slider label="粒子生成量" value={settings.emissionRate} min={50} max={1200} step={50} unit="/s" onChange={v => update('emissionRate', v)}/>
            <Slider label="拖尾长度" value={settings.trailLength} min={0} max={240} unit="px" onChange={v => update('trailLength', v)}/>
            <Slider label="拖尾不透明度" value={Math.round(settings.trailOpacity * 100)} min={0} max={100} unit="%" onChange={v => update('trailOpacity', v / 100)}/>
            <p className="opacity-hint">低：水滴颗粒 · 高：连续线条</p>
            <fieldset className="mode-field shadow-field"><legend>拖尾颜色</legend><div className="mode-options">
              {[['gradient', '渐变色'], ['solid', '纯粒子色']].map(([value, label]) => <label key={value} className="mode-option"><input type="radio" name="trailColorMode" value={value} checked={settings.trailColorMode === value} onChange={() => update('trailColorMode', value)}/><span>{label}</span></label>)}
            </div></fieldset>
            <label className="glow-field"><span>自动渐隐</span><input type="checkbox" role="switch" aria-label="自动渐隐" checked={settings.trailAutoFade} onChange={e => update('trailAutoFade', e.target.checked)}/><span className="switch" aria-hidden="true"/></label>
            <p className="trail-options-hint">纯色实线：纯粒子色 + 关渐隐 + 不透明度 100%</p>
            <div className="section-caption appearance-caption">外观 / APPEARANCE</div>
            <Slider label="文字粒子密集度" value={Math.round(settings.textParticleDensity * 100)} min={10} max={1200} step={5} unit="%" onChange={v => update('textParticleDensity', v / 100)}/>
            <Slider label="粒子大小" value={settings.particleSize} min={0.5} max={4} step={0.1} unit="px" onChange={v => update('particleSize', v)}/>
            <label className="glow-field"><span>粒子大小随机</span><input type="checkbox" role="switch" aria-label="粒子大小随机" checked={settings.particleSizeRandom} onChange={e => update('particleSizeRandom', e.target.checked)}/><span className="switch" aria-hidden="true"/></label>
            <Slider label="大小随机幅度" value={Math.round(settings.particleSizeVariation * 100)} min={0} max={100} unit="%" disabled={!settings.particleSizeRandom} onChange={v => update('particleSizeVariation', v / 100)}/>
            <p className="trail-options-hint">幅度越大，粒子大小差异越明显；设为 0% 时大小一致。</p>
            <div className="color-row">{[['color', '文字颜色'], ['highlightColor', '粒子颜色']].map(([key, label]) => <label className="color-field" key={key}><span>{label}</span><span className="color-value"><input type="color" aria-label={label} value={settings[key]} onChange={e => update(key, e.target.value)}/><span>{settings[key].toUpperCase()}</span></span></label>)}</div>
            {settings.waterfallStyle === 'curtain' && <fieldset className="mode-field shadow-field"><legend>文字底色</legend><div className="mode-options">
              {[[true, '开底色'], [false, '关底色']].map(([value, label]) => <label key={label} className="mode-option"><input type="radio" name="textUnderlay" value={String(value)} checked={settings.textUnderlay === value} onChange={() => update('textUnderlay', value)}/><span>{label}</span></label>)}
            </div><div className="effect-adjustments"><label className="color-field effect-color"><span>底色颜色</span><span className="color-value"><input type="color" aria-label="底色颜色" value={settings.underlayColor} onChange={e => update('underlayColor', e.target.value)}/><span>{settings.underlayColor.toUpperCase()}</span></span></label>{settings.textUnderlay && <Slider label="底色 Glow Diffusion" value={settings.underlayDiffusion} min={0} max={40} unit="px" onChange={v => update('underlayDiffusion', v)}/>}</div><p>填充文字内部，关闭后只显示文字粒子</p></fieldset>}
            <fieldset className="mode-field shadow-field"><legend>文字光晕</legend><div className="mode-options">
              {[[true, '开光晕'], [false, '关光晕']].map(([value, label]) => <label key={label} className="mode-option"><input type="radio" name="textShadow" value={String(value)} checked={settings.glow === value} onChange={() => update('glow', value)}/><span>{label}</span></label>)}
            </div><div className="effect-adjustments"><label className="color-field effect-color"><span>光晕颜色</span><span className="color-value"><input type="color" aria-label="光晕颜色" value={settings.glowColor} onChange={e => update('glowColor', e.target.value)}/><span>{settings.glowColor.toUpperCase()}</span></span></label>{settings.glow && <Slider label="光晕 Glow Diffusion" value={settings.glowDiffusion} min={0} max={40} unit="px" onChange={v => update('glowDiffusion', v)}/>}</div><Slider label="背景渐变透明度" value={settings.backgroundGradientOpacity} min={0} max={100} unit="%" onChange={v => update('backgroundGradientOpacity', v)}/><Slider label="背景渐变高度" value={settings.backgroundGradientHeight} min={10} max={100} unit="%" onChange={v => update('backgroundGradientHeight', v)}/><Slider label="背景渐变角度" value={settings.backgroundGradientAngle} min={0} max={360} step={5} unit="°" onChange={v => update('backgroundGradientAngle', v)}/><p>角度按 CSS 方向：180° 从上向下；高度控制渐隐结束位置。</p></fieldset>
            <div className="section-caption appearance-caption">文字扫光 / SPARKLE</div>
            <label className="glow-field"><span><Icon name="sparkle" size={15}/>文字扫光</span><input type="checkbox" role="switch" aria-label="文字扫光" checked={settings.textSparkles} onChange={e => update('textSparkles', e.target.checked)}/><span className="switch" aria-hidden="true"/></label>
            <p className="trail-options-hint">一道柔亮高光从左向右掠过文字，呈现流动的反光。</p>
            <fieldset className="mode-field"><legend>扫光形态</legend><div className="mode-options">
              {[['linear', '柔亮光带'], ['random', '随机爆闪']].map(([value, label]) => <label key={value} className="mode-option"><input type="radio" name="textSparkleShape" value={value} checked={settings.textSparkleShape === value} onChange={() => update('textSparkleShape', value)}/><span>{label}</span></label>)}
            </div></fieldset>
            {settings.textSparkleShape === 'random' && <>
              <Slider label="爆闪频率" value={settings.textSparkleBurstRate} min={0} max={5} step={0.1} unit="次/s" disabled={!settings.textSparkles} onChange={v => update('textSparkleBurstRate', v)}/>
              <Slider label="爆闪时长" value={settings.textSparkleBurstDuration} min={80} max={1000} step={20} unit="ms" disabled={!settings.textSparkles} onChange={v => update('textSparkleBurstDuration', v)}/>
              <Slider label="路径随机度" value={Math.round(settings.textSparklePathRandom * 100)} min={0} max={100} unit="%" disabled={!settings.textSparkles} onChange={v => update('textSparklePathRandom', v / 100)}/>
              <Slider label="形状随机度" value={Math.round(settings.textSparkleShapeRandom * 100)} min={0} max={100} unit="%" disabled={!settings.textSparkles} onChange={v => update('textSparkleShapeRandom', v / 100)}/>
              <p className="trail-options-hint">每次随机选取文字位置，沿不同方向和弧线短促闪亮；随机度越高，路径和光斑越多变。</p>
            </>}
            {settings.textSparkleShape !== 'random' && <Slider label="扫光频率" value={Math.round(settings.textSparkleAmount * 100)} min={0} max={100} unit="%" disabled={!settings.textSparkles} onChange={v => update('textSparkleAmount', v / 100)}/>} 
            <Slider label="扫光亮度" value={Math.round(settings.textSparkleIntensity * 100)} min={0} max={100} unit="%" disabled={!settings.textSparkles} onChange={v => update('textSparkleIntensity', v / 100)}/>
            <Slider label="扫光速度" value={settings.textSparkleSpeed} min={0.2} max={3} step={0.1} unit="×" disabled={!settings.textSparkles} onChange={v => update('textSparkleSpeed', v)}/>
            <Slider label="光带宽度" value={Math.round(16 + settings.textSparkleSize * 30)} min={31} max={136} step={3} unit="px" disabled={!settings.textSparkles} onChange={v => update('textSparkleSize', Number(((v - 16) / 30).toFixed(1)))}/>
            <label className="glow-field"><span><Icon name="sparkle" size={15}/>明亮闪点</span><input type="checkbox" role="switch" checked={settings.brightSparkles} onChange={e => update('brightSparkles', e.target.checked)}/><span className="switch" aria-hidden="true"/></label>
            <Slider label="明亮闪点大小" value={settings.brightSparkleSize} min={50} max={300} step={10} unit="%" disabled={!settings.brightSparkles} onChange={v => update('brightSparkleSize', v)}/>
            <Slider label="背景闪烁星星数量" value={settings.backgroundStarCount} min={0} max={120} unit="颗" disabled={!settings.brightSparkles} onChange={v => update('backgroundStarCount', v)}/>
          </div><div className="panel-hint"><span/> 调整参数，即刻看见变化</div>
        </aside>
      </div>
      <div className="below-preview"><span>文字留在原地，让灵感自由下落。</span><span>{rendererStatus === 'three' ? 'THREE.JS / WEBGL' : 'CANVAS 2D'} <b>·</b> REACT BITS <b>·</b> JS + CSS</span></div>
    </main><footer><span>FLOWTYPE — A LITTLE EXPERIMENT IN MOTION</span><span>把片刻，变成流动的光 <span className="footer-star">✳</span></span></footer>
  </div>;
}
