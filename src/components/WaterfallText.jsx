import { useEffect, useRef } from 'react';
import './ParticleText.css';
import { buildDriftClearance } from '../lib/particleDrift';

// A separate renderer keeps the registry component's original behavior intact.
export default function WaterfallText({ particleAlphaRandom = true, particleAlphaVariation = 0.6, particleLiveliness = 0.55, particleDriftSpeed = 1, particleTwinkle = true, particleTwinkleIntensity = 0.8, particleTwinkleSpeed = 1, renderer = 'canvas', onRendererStatus, text = 'React Bits', particleSize = 2, particleShape = 'circle', particleSizeRandom = false, particleSizeVariation = 0.5, density = 4, textParticleDensity = 1,
  color = '#ddd0ff', highlightColor = '#8b5cf6', underlayColor = color, glowColor = highlightColor, underlayDiffusion = 9, glowDiffusion = 4, fontSize = 'clamp(3rem, 12vw, 8rem)',
  fontWeight = 800, fontFamily = 'inherit', glow = true, textUnderlay = true, fallSpeed = 90,
  emissionRate = 500, waterfallAmount = 1, trailLength = 120, trailOpacity = 1, trailColorMode = 'gradient', trailAutoFade = true, connected = true, connectionStrength = 1, waterfallStyle = 'curtain', brightSparkles = true, brightSparkleSize = 100, backgroundStarCount = 36, textSparkleBurstRate = 2, textSparkleBurstDuration = 240, textSparklePathRandom = 1, textSparkleShapeRandom = 0.75, textSparkleShape = 'linear', textSparkleScale = 45, textSparkleFlow = 1, textSparkles = true, textSparkleAmount = 0.45, textSparkleIntensity = 0.8, textSparkleSpeed = 1, textSparkleSize = 1.5, paused = false, canvasWidth, canvasHeight, className = '', style }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const backend = useRef({});
  backend.current = { renderer, onRendererStatus };
  const live = useRef({});
  const bounded = (value, min, max, fallback) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  live.current = { particleDriftSpeed: bounded(particleDriftSpeed, 0, 3, 1), particleAlphaRandom, particleAlphaVariation: bounded(particleAlphaVariation, 0, 1, 0.6), particleLiveliness: bounded(particleLiveliness, 0, 1, 0.55), particleTwinkle, particleTwinkleIntensity: bounded(particleTwinkleIntensity, 0, 1, 0.8), particleTwinkleSpeed: bounded(particleTwinkleSpeed, 0.2, 3, 1), particleShape, particleSizeRandom, particleSizeVariation: bounded(particleSizeVariation, 0, 1, 0.5), textSparkleBurstRate: bounded(textSparkleBurstRate, 0, 5, 2), textSparkleBurstDuration: bounded(textSparkleBurstDuration, 80, 1000, 240), textSparklePathRandom: bounded(textSparklePathRandom, 0, 1, 1), textSparkleShapeRandom: bounded(textSparkleShapeRandom, 0, 1, 0.75), textSparkleShape, textSparkleScale: bounded(textSparkleScale, 10, 150, 45), textSparkleFlow: bounded(textSparkleFlow, 0, 3, 1), textSparkles, textSparkleAmount: bounded(textSparkleAmount, 0, 1, 0.45), textSparkleIntensity: bounded(textSparkleIntensity, 0, 1, 0.8), textSparkleSpeed: bounded(textSparkleSpeed, 0.2, 3, 1), textSparkleSize: bounded(textSparkleSize, 0.5, 4, 1.5), trailColorMode, trailAutoFade, connection: connected ? Math.max(0, Math.min(1, Number.isFinite(connectionStrength) ? connectionStrength : 1)) : 0, textParticleDensity: Math.max(0.1, Math.min(12, Number.isFinite(textParticleDensity) ? textParticleDensity : 1)), particleSize, color, highlightColor, underlayColor, glowColor, underlayDiffusion: Math.max(0, Math.min(40, underlayDiffusion)), glowDiffusion: Math.max(0, Math.min(40, glowDiffusion)), glow, textUnderlay, fallSpeed, emissionRate, waterfallAmount: Math.max(0, Math.min(1, Number.isFinite(waterfallAmount) ? waterfallAmount : 1)), trailLength, trailOpacity: Math.max(0, Math.min(1, Number.isFinite(trailOpacity) ? trailOpacity : 1)), brightSparkles, brightSparkleSize: bounded(brightSparkleSize, 50, 300, 100), backgroundStarCount: Math.round(bounded(backgroundStarCount, 0, 120, 36)), paused };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const threeCanvas = threeCanvasRef.current;
    let gpu = null, gpuActive = false, rendererRequest = 0, dpr = 1;
    let particleGroup = 'heads', sparkleGroup = 'dropStars';
    let width = 0, height = 0, frame = 0, build = 0, disposed = false;
    let points = [], glyphPoints = [], drops = [], elapsed = 0, previous = 0, emission = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motion.matches;
    const classic = waterfallStyle === 'classic';
    const maxDrops = 2600;
    let glyphPixels = null;
    const insideGlyph = (x, y) => x >= 0 && y >= 0 && x < width && y < height && glyphPixels?.[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] > 100;
    let glyphMask = null, tintedGlyph = null, curtainLayer = null, rootLayer = null, layerKey = '';
    let streams = [], stars = [], activeSources = [];
    let driftTime = 0, twinkleTime = 0, sparkleTime = 0, sweepLayer = null, sweepBounds = { left: 0, right: 0, centerY: 0 };
    let bursts = [], burstWait = 0;
    let noiseLayer = null, noisePixels = null, flowTime = 0;
    let cachedUnderlay = null, cachedGlow = null, textLayerKey = '';
    let visibleGlyphs = [], visibleDensity = -1;
    const prepareTextLayers = p => {
      const key = [p.underlayColor, p.underlayDiffusion, p.glowColor, p.glowDiffusion].join('|');
      if (!glyphMask || textLayerKey === key) return;
      textLayerKey = key;
      const makeLayer = (color, blur, haloOnly = false) => {
        const tint = document.createElement('canvas'); tint.width = width; tint.height = height;
        const t = tint.getContext('2d');
        t.drawImage(glyphMask, 0, 0); t.globalCompositeOperation = 'source-in';
        t.fillStyle = color; t.fillRect(0, 0, width, height);
        const layer = document.createElement('canvas'); layer.width = width; layer.height = height;
        const g = layer.getContext('2d'); g.shadowColor = color; g.shadowBlur = blur;
        g.drawImage(tint, 0, 0);
        if (haloOnly) {
          g.shadowBlur = 0; g.globalCompositeOperation = 'destination-out';
          g.drawImage(glyphMask, 0, 0);
        }
        return layer;
      };
      cachedUnderlay = makeLayer(p.underlayColor, p.underlayDiffusion);
      cachedGlow = makeLayer(p.glowColor, p.glowDiffusion, true);
    };
    const hash = (x, y) => {
      let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };
    const noise = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
      return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
    };
    const turbulence = (x, y) => noise(x, y) * 0.57 + noise(x * 2 + 17, y * 2 + 9) * 0.29 + noise(x * 4 + 31, y * 4) * 0.14;
    let sourceAmount = -1;
    const updateSources = () => {
      const amount = live.current.waterfallAmount;
      if (sourceAmount === amount) return;
      sourceAmount = amount;
      activeSources = streams.filter(source => source.rank < amount);
    };
    const variedSize = (base, seed, p) => base * (p.particleSizeRandom ? 1 + (seed * 2 - 1) * p.particleSizeVariation * 0.9 : 1);
    const drawParticle = (x, y, size, shape) => {
      if (gpuActive) {
        gpu.particle(particleGroup, x, y, size, shape, ctx.fillStyle, ctx.globalAlpha, ctx.shadowBlur, ctx.shadowColor);
        return;
      }
      const r = size / 2;
      if (shape === 'square') { ctx.fillRect(x - r, y - r, size, size); return; }
      ctx.beginPath();
      if (shape === 'circle') ctx.arc(x, y, r, 0, Math.PI * 2);
      else if (shape === 'diamond') {
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      } else if (shape === 'star') {
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + i * Math.PI / 5;
          const radius = i % 2 ? r * 0.45 : r;
          const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else { ctx.rect(x - r, y - r, size, size); }
      ctx.fill();
    };
    const sparkle = (x, y, radius, alpha) => {
      const p = live.current;
      if (gpuActive) { gpu.sparkle(sparkleGroup, x, y, radius, alpha, p.color, p.highlightColor); return; }
      ctx.globalAlpha = alpha;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 5);
      halo.addColorStop(0, p.color);
      halo.addColorStop(0.18, p.highlightColor);
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.fillRect(x - radius * 5, y - radius * 5, radius * 10, radius * 10);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, radius * 0.65, 0, Math.PI * 2); ctx.fill();
      if (alpha > 0.65) {
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillRect(x - radius * 2, y - 0.3, radius * 4, 0.6);
        ctx.fillRect(x - 0.3, y - radius * 2.5, 0.6, radius * 5);
      }
    };
    const updateBursts = (dt, p) => {
      if (p.textSparkleShape !== 'random' || !p.textSparkles || p.textSparkleBurstRate === 0) {
        bursts = []; burstWait = 0; return;
      }
      if (!dt || reduced) return;
      bursts.forEach(b => { b.age += dt; });
      bursts = bursts.filter(b => b.age < b.duration);
      burstWait -= dt * p.textSparkleBurstRate;
      if (burstWait <= 0 && points.length) {
        const anchor = points[Math.floor(Math.random() * points.length)];
        bursts.push({ x: anchor.x, y: anchor.y, age: 0, duration: p.textSparkleBurstDuration / 1000,
          angle: Math.random() * Math.PI * 2, bend: Math.random() * 2 - 1,
          seed: Math.random() * 100, stretch: Math.random(), size: Math.random() });
        if (bursts.length > 12) bursts.shift();
        burstWait = 0.4 + Math.random() * 1.2;
      }
    };
    const drawRandomBursts = p => {
      if (!noiseLayer || !glyphMask || !p.textSparkleBurstRate) return;
      const active = reduced ? [{ x: width / 2, y: sweepBounds.centerY, age: 0.1, duration: 0.5, angle: 0, bend: 0, seed: 12, stretch: 0.5, size: 0.5 }] : bursts;
      if (!active.length) return;
      const data = noisePixels.data;
      const band = 16 + p.textSparkleSize * 30;
      const prepared = active.map(b => {
        const t = b.age / b.duration;
        const angle = b.angle * p.textSparklePathRandom;
        // Peak brightness must coincide with the chosen glyph anchor.
        const travel = (t - 0.08) * band * 2 * p.textSparkleSpeed;
        const curve = Math.sin((t - 0.08) * Math.PI) * b.bend * band * p.textSparklePathRandom;
        return { ...b, cx: b.x + Math.cos(angle) * travel - Math.sin(angle) * curve,
          cy: b.y + Math.sin(angle) * travel + Math.cos(angle) * curve,
          cos: Math.cos(angle), sin: Math.sin(angle),
          radius: band * (0.55 + b.size * p.textSparkleShapeRandom),
          aspect: 1 + b.stretch * 3 * p.textSparkleShapeRandom,
          opacity: reduced ? 0.3 : t < 0.08 ? t / 0.08 : Math.pow((1 - t) / 0.92, 1.7) };
      });
      for (let y = 0; y < noiseLayer.height; y++) for (let x = 0; x < noiseLayer.width; x++) {
        const px = x * 4, py = sweepBounds.top + y * 4;
        let alpha = 0;
        for (const b of prepared) {
          const dx = px - b.cx, dy = py - b.cy;
          const u = (dx * b.cos + dy * b.sin) / b.radius;
          const v = (-dx * b.sin + dy * b.cos) / (b.radius * b.aspect);
          const distance = Math.sqrt(u * u + v * v);
          if (distance > 1.6) continue;
          const n = turbulence(px / p.textSparkleScale + b.seed + flowTime * 0.2, py / p.textSparkleScale - flowTime * 0.3);
          const edge = distance + (n - 0.5) * p.textSparkleShapeRandom * 1.4;
          alpha += Math.pow(Math.max(0, 1 - edge), 1.4) * b.opacity * 1.7;
        }
        const i = (y * noiseLayer.width + x) * 4;
        data[i] = 245; data[i + 1] = 248; data[i + 2] = 255;
        data[i + 3] = Math.round(Math.min(1, alpha) * 255);
      }
      noiseLayer.getContext('2d').putImageData(noisePixels, 0, 0);
      const g = sweepLayer.getContext('2d');
      g.clearRect(0, 0, width, height);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(glyphMask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.drawImage(noiseLayer, 0, sweepBounds.top, width, noiseLayer.height * 4);
      if (gpuActive) { gpu.layer('sweep', sweepLayer, p.textSparkleIntensity, { dynamic: true, additive: true }); return; }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = p.textSparkleIntensity; ctx.shadowBlur = 0;
      ctx.drawImage(sweepLayer, 0, 0); ctx.restore();
    };
    // A moving soft-edged highlight, clipped to the full glyph silhouette.
    const drawTextSweep = p => {
      if (!sweepLayer || !glyphMask || p.textSparkleAmount <= 0) return;
      const band = 16 + p.textSparkleSize * 30;
      const duration = 2.2;
      const rest = (1 - p.textSparkleAmount) * 3;
      const cycle = sparkleTime % (duration + rest);
      if (!reduced && cycle > duration) return;
      const progress = reduced ? 0.5 : cycle / duration;
      const center = sweepBounds.left - band * 2 + progress * (sweepBounds.right - sweepBounds.left + band * 4);
      const g = sweepLayer.getContext('2d');
      g.clearRect(0, 0, width, height);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(glyphMask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      // The diagonal band crosses all lines together from left to right.
      const gradient = g.createLinearGradient(center - band, sweepBounds.centerY - band * 0.25, center + band, sweepBounds.centerY + band * 0.25);
      gradient.addColorStop(0, 'rgba(235,240,255,0)');
      gradient.addColorStop(0.25, 'rgba(235,240,255,0.08)');
      gradient.addColorStop(0.46, 'rgba(250,252,255,0.7)');
      gradient.addColorStop(0.54, '#ffffff');
      gradient.addColorStop(0.7, 'rgba(235,240,255,0.25)');
      gradient.addColorStop(1, 'rgba(235,240,255,0)');
      g.fillStyle = gradient;
      g.fillRect(0, 0, width, height);
      if (gpuActive) { gpu.layer('sweep', sweepLayer, p.textSparkleIntensity, { dynamic: true, additive: true }); return; }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = p.textSparkleIntensity;
      ctx.shadowBlur = 0;
      ctx.drawImage(sweepLayer, 0, 0);
      ctx.restore();
    };
    // Cache the dense, soft light curtain; only moving dust needs per-frame work.
    const prepareLayers = () => {
      const p = live.current;
      const trailColor = p.trailColorMode === 'solid' ? p.highlightColor : p.color;
      const key = [p.underlayColor, p.color, p.highlightColor, p.trailLength, p.glow, p.emissionRate, p.waterfallAmount, p.particleSize, p.connection, p.trailColorMode, p.trailAutoFade].join('|');
      if (key === layerKey || !glyphMask) return;
      layerKey = key;
      tintedGlyph = document.createElement('canvas');
      tintedGlyph.width = width; tintedGlyph.height = height;
      const g = tintedGlyph.getContext('2d');
      g.drawImage(glyphMask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = p.underlayColor; g.fillRect(0, 0, width, height);
      curtainLayer = document.createElement('canvas');
      curtainLayer.width = width; curtainLayer.height = height;
      const c = curtainLayer.getContext('2d');
      rootLayer = document.createElement('canvas');
      rootLayer.width = width; rootLayer.height = height;
      const r = rootLayer.getContext('2d');
      if (p.trailLength <= 0) return;
      for (const stream of streams) {
        if (stream.rank >= p.waterfallAmount) continue;
        // An overlapping transition band bridges the last stroke into the fall.
        const sourceY = stream.edgeY + (stream.y - stream.edgeY) * p.connection;
        const rootEnd = stream.edgeY + Math.max(0.1, Math.min(stream.blendLength * p.connection, p.trailLength));
        const rootGradient = r.createLinearGradient(0, sourceY, 0, rootEnd);
        rootGradient.addColorStop(0, p.trailAutoFade ? 'transparent' : trailColor);
        rootGradient.addColorStop(0.2, trailColor);
        rootGradient.addColorStop(0.45, trailColor);
        rootGradient.addColorStop(0.72, p.highlightColor);
        rootGradient.addColorStop(1, p.trailAutoFade ? 'transparent' : p.highlightColor);
        r.strokeStyle = rootGradient;
        r.globalAlpha = p.connection * (p.trailAutoFade ? (classic ? 0.3 : 0.5) * Math.min(1.3, p.emissionRate / 500) : 1);
        r.lineWidth = Math.max(0.8, stream.spacing * (classic ? 0.48 : 0.78));
        r.beginPath(); r.moveTo(stream.x, sourceY); r.lineTo(stream.x, rootEnd); r.stroke();
        const length = Math.min(height - sourceY - 12, p.trailLength * (1.1 + stream.seed * 0.9));
        if (length <= 0) continue;
        const gradient = c.createLinearGradient(0, sourceY, 0, sourceY + length);
        gradient.addColorStop(0, trailColor);
        gradient.addColorStop(0.15, p.highlightColor);
        gradient.addColorStop(0.7, p.highlightColor);
        gradient.addColorStop(1, p.trailAutoFade ? 'transparent' : p.highlightColor);
        c.strokeStyle = gradient;
        c.globalAlpha = p.trailAutoFade ? (0.07 + stream.seed * 0.16) * Math.min(1.7, p.emissionRate / 500) : 1;
        c.lineWidth = p.trailAutoFade ? 0.5 + stream.seed * 0.65 : 1;
        c.beginPath(); c.moveTo(stream.x, sourceY); c.lineTo(stream.x, sourceY + length); c.stroke();
      }
    };
    const randomDrop = (warm = false) => {
      if (!activeSources.length || drops.length >= maxDrops) return;
      const source = activeSources[Math.floor(Math.random() * activeSources.length)];
      const lifespan = 1.8 + Math.random() * 2.4;
      const speed = 0.5 + Math.random();
      const age = warm ? Math.random() * lifespan : 0;
      drops.push({ rank: source.rank, x: source.x, origin: source.y, edgeY: source.edgeY,
        distance: age * Math.max(0, live.current.fallSpeed) * speed,
        age, lifespan, speed,
        alpha: 0.16 + Math.random() * 0.5, size: 0.35 + Math.random() * 0.5, seed: Math.random() * 20, bright: Math.random() < 0.025 });
    };
    const draw = (dt = 0) => {
      const p = live.current;
      const trailColor = p.trailColorMode === 'solid' ? p.highlightColor : p.color;
      elapsed += dt;
      driftTime += dt * p.particleDriftSpeed;
      twinkleTime += dt * p.particleTwinkleSpeed;
      sparkleTime += dt * p.textSparkleSpeed;
      flowTime += dt * p.textSparkleFlow;
      if (gpuActive) gpu.begin(p);
      else ctx.clearRect(0, 0, width, height);
      if (!points.length) { if (gpuActive) gpu.render(); return; }
      particleGroup = 'heads'; sparkleGroup = 'dropStars';
      ctx.shadowBlur = 0;
      updateSources();
      updateBursts(dt, p);
      prepareLayers();
      prepareTextLayers(p);
      if (visibleDensity !== p.textParticleDensity) {
        visibleDensity = p.textParticleDensity;
        visibleGlyphs = glyphPoints.filter(point => point.textRank < visibleDensity);
      }
      // Keep the original text body available independently of the outer glow.
      if (!classic && p.textUnderlay && cachedUnderlay) {
        ctx.globalAlpha = 0.32 * Math.min(1, p.textParticleDensity);
        if (gpuActive) gpu.layer('underlay', cachedUnderlay, ctx.globalAlpha);
        else ctx.drawImage(cachedUnderlay, 0, 0);
      }
      ctx.shadowBlur = 0;
      if (!classic && !reduced && curtainLayer) {
        ctx.globalAlpha = p.trailOpacity;
        if (gpuActive) gpu.layer('curtain', curtainLayer, ctx.globalAlpha);
        else ctx.drawImage(curtainLayer, 0, 0);
      }
      if (!reduced) {
        emission += dt * Math.max(0, p.emissionRate);
        const count = Math.min(Math.floor(emission), maxDrops);
        emission -= Math.floor(emission);
        for (let i = 0; i < count; i++) randomDrop();
        // Streams overlap the bottom half-pixel of the glyph body; text dots finish the seam.
        ctx.lineWidth = p.trailAutoFade ? (classic ? 0.6 : 0.45) : 1;
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.age += dt;
          d.distance += dt * Math.max(0, p.fallSpeed) * d.speed;
          const origin = d.edgeY + (d.origin - d.edgeY) * p.connection;
          const y = origin + d.distance;
          if (d.age >= d.lifespan || y > height + p.trailLength) { drops.splice(i, 1); continue; }
          if (d.rank >= p.waterfallAmount) continue;
          const x = d.x + Math.sin(elapsed * 0.7 + d.seed) * 0.6 * Math.min(1, d.distance / 40);
          const tail = Math.min(d.distance, Math.max(0, p.trailLength) * d.speed);
          const fade = Math.sin(Math.min(1, d.age / 0.06) * Math.PI / 2) * (1 - d.age / d.lifespan);
          const headAlpha = d.alpha * fade * Math.max(0, Math.min(1, (height - y) / 65));
          ctx.globalAlpha = (p.trailAutoFade ? headAlpha : 1) * p.trailOpacity;
          if (tail > 0.5) {
            if (gpuActive) {
              gpu.trail(x, y - tail, y, ctx.lineWidth,
                !p.trailAutoFade || (p.connection > 0 && d.distance <= Math.max(0, p.trailLength) * d.speed) ? trailColor : 'transparent',
                p.highlightColor, trailColor, classic ? 0.8 : 0.3, ctx.globalAlpha);
            } else {
              const gradient = ctx.createLinearGradient(x, y - tail, x, y);
              gradient.addColorStop(0, !p.trailAutoFade || (p.connection > 0 && d.distance <= Math.max(0, p.trailLength) * d.speed) ? trailColor : 'transparent');
              gradient.addColorStop(classic ? 0.8 : 0.3, p.highlightColor);
              gradient.addColorStop(1, trailColor);
              ctx.strokeStyle = gradient;
              ctx.beginPath(); ctx.moveTo(x, y - tail); ctx.lineTo(x, y); ctx.stroke();
            }
          }
          // Heads stay visible as the trails fade into a droplet-like effect.
          ctx.globalAlpha = headAlpha;
          ctx.fillStyle = trailColor;
          drawParticle(x, y, variedSize(p.particleSize * 0.6, d.seed / 20, p), p.particleShape);
          if (p.brightSparkles && d.bright) {
            const pulse = Math.pow(0.5 + 0.5 * Math.sin(elapsed * 3 + d.seed), 5);
            sparkle(x, y, (0.6 + p.particleSize * 0.4) * p.brightSparkleSize / 100, fade * pulse * Math.max(0, Math.min(1, (height - y) / 65)));
          }
        }
      }
      if (p.glow && p.glowDiffusion > 0 && cachedGlow) {
        ctx.globalAlpha = 0.55 * Math.min(1, p.textParticleDensity);
        if (gpuActive) gpu.layer('glyphGlow', cachedGlow, ctx.globalAlpha);
        else ctx.drawImage(cachedGlow, 0, 0);
      }
      particleGroup = 'glyphs';
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.glowColor;
      ctx.shadowBlur = 0;
      for (const point of visibleGlyphs) {
        // Each dot owns its phase and cadence, including the extra density samples.
        // Modulate the particle itself rather than adding a large star/halo on top.
        const strength = !reduced && p.particleTwinkle ? p.particleTwinkleIntensity : 0;
        const pulse = strength > 0
          ? Math.pow(0.5 + 0.5 * Math.sin(twinkleTime * point.twinkleRate + point.twinklePhase), 6)
          : 0;
        const shimmer = 0.8 * (1 - strength) + (0.08 + 0.92 * pulse) * strength;
        // Stable per-particle randomness avoids flicker and remains adjustable while paused.
        const alphaScale = p.particleAlphaRandom ? 1 - p.particleAlphaVariation * point.alphaSeed : 1;
        ctx.globalAlpha = point.alpha * shimmer * alphaScale;
        const size = variedSize(p.particleSize * point.baseSize, point.seed / 30, p);
        const drift = reduced ? 0 : p.particleLiveliness;
        // A safe square around each anchor contains the entire local orbit.
        // Separate phases/cadences keep the particles from moving in unison.
        const radius = point.driftRadius * drift;
        const x = point.x + Math.sin(driftTime * point.driftRate + point.seed) * radius;
        const y = point.y + Math.cos(driftTime * point.driftRate * 0.73 + point.twinklePhase) * radius;
        ctx.fillStyle = p.color;
        drawParticle(x, y, size, p.particleShape);

      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (!reduced && p.connection > 0) {
        // Draw across the edge after the letters, so the connection is not hidden
        // behind the optional text body. These particles visibly cross the boundary.
        ctx.globalAlpha = p.trailOpacity;
        if (rootLayer) {
          if (gpuActive) gpu.layer('root', rootLayer, ctx.globalAlpha);
          else ctx.drawImage(rootLayer, 0, 0);
        }
        particleGroup = 'connections';
        ctx.fillStyle = trailColor;
        for (const stream of activeSources) {
          const sourceY = stream.edgeY + (stream.y - stream.edgeY) * p.connection;
          const span = stream.edgeY - sourceY + stream.blendLength * p.connection;
          for (let i = 0; i < 2; i++) {
            const travel = (elapsed * p.fallSpeed * (0.7 + stream.seed * 0.5) + span * (stream.seed + i / 2)) % span;
            const progress = travel / span;
            ctx.globalAlpha = p.connection * Math.sin(progress * Math.PI) * (classic ? 0.6 : 0.85) * Math.min(1, p.emissionRate / 500);
            const dot = variedSize(p.particleSize * 0.6, stream.seed, p);
            drawParticle(stream.x, sourceY + travel, dot, p.particleShape);
          }
        }
      }
      ctx.globalAlpha = 1;
      if (p.textSparkles && p.textSparkleIntensity > 0) {
        if (p.textSparkleShape === 'random') drawRandomBursts(p);
        else drawTextSweep(p);
      }
      if (p.brightSparkles) {
        sparkleGroup = 'stars';
        for (const star of stars.slice(0, p.backgroundStarCount)) {
          const pulse = reduced ? 0.2 : Math.pow(0.5 + 0.5 * Math.sin(elapsed * star.rate + star.phase), 5);
          const y = star.y + (reduced ? 0 : Math.sin(elapsed * 0.22 + star.phase) * 8);
          sparkle(star.x, y, star.radius * p.brightSparkleSize / 100, pulse * 0.95);
        }
      }
      ctx.globalAlpha = 1;
      if (gpuActive) gpu.render();
    };
    const showBackend = () => {
      canvas.style.visibility = gpuActive ? 'hidden' : 'visible';
      threeCanvas.style.visibility = gpuActive ? 'visible' : 'hidden';
      container.dataset.renderer = gpuActive ? 'three' : 'canvas';
    };
    const rendererFailure = error => {
      gpuActive = false;
      showBackend();
      draw();
      backend.current.onRendererStatus?.('error', error?.message || 'WebGL 初始化失败');
    };
    const activateRenderer = async () => {
      const request = ++rendererRequest;
      if (backend.current.renderer !== 'three') {
        gpuActive = false; draw(); showBackend();
        backend.current.onRendererStatus?.('canvas');
        return;
      }
      backend.current.onRendererStatus?.('loading');
      try {
        const { default: ThreeWaterfallRenderer } = await import('../lib/ThreeWaterfallRenderer');
        if (disposed || request !== rendererRequest) return;
        if (!gpu) gpu = new ThreeWaterfallRenderer(threeCanvas);
        gpu.resize(Math.max(1, width), Math.max(1, height), dpr);
        gpuActive = true;
        draw(); showBackend();
        backend.current.onRendererStatus?.('three');
      } catch (error) { if (!disposed && request === rendererRequest) rendererFailure(error); }
    };
    const tick = now => {
      frame = 0;
      if (disposed || document.hidden) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      try { draw(live.current.paused || reduced ? 0 : dt); }
      catch (error) { if (gpuActive) rendererFailure(error); else throw error; }
      if (!reduced) frame = requestAnimationFrame(tick);
    };
    const restart = () => { previous = 0; if (!frame && !document.hidden && !disposed) frame = requestAnimationFrame(tick); };
    const sample = async () => {
      const id = ++build;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const family = fontFamily === 'inherit' ? getComputedStyle(container).fontFamily : fontFamily;
      const probe = document.createElement('span');
      Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize });
      container.appendChild(probe);
      let size = parseFloat(getComputedStyle(probe).fontSize) || 80;
      probe.remove();
      try { await document.fonts.load(`${fontWeight} ${size}px ${family}`); await document.fonts.ready; } catch { /* System font remains usable. */ }
      if (disposed || id !== build) return;
      const fixedResolution = Number.isFinite(canvasWidth) && canvasWidth > 0 && Number.isFinite(canvasHeight) && canvasHeight > 0;
      width = Math.floor(fixedResolution ? canvasWidth : rect.width);
      height = Math.floor(fixedResolution ? canvasHeight : rect.height);
      dpr = fixedResolution ? 1 : Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gpu) gpu.resize(width, height, dpr);
      const offscreen = document.createElement('canvas');
      offscreen.width = width; offscreen.height = height;
      const off = offscreen.getContext('2d', { willReadFrequently: true });
      if (!off) return;
      const lines = String(text).split('\n');
      off.font = `${fontWeight} ${size}px ${family}`;
      const widest = Math.max(1, ...lines.map(line => off.measureText(line).width));
      size = Math.min(size, size * width * 0.87 / widest, height * 0.45 / (lines.length * 1.32));
      off.font = `${fontWeight} ${size}px ${family}`;
      off.textAlign = 'center'; off.textBaseline = 'middle'; off.fillStyle = '#fff';
      const lineHeight = size * 1.32;
      const start = height * 0.39 - (lines.length - 1) * lineHeight / 2;
      lines.forEach((line, i) => off.fillText(line, width / 2, start + i * lineHeight));
      const pixels = off.getImageData(0, 0, width, height).data;
      glyphPixels = pixels;
      const requestedStep = Math.max(1.5, Number(density) || 4);
      // Small screens need finer sampling to keep thin letter strokes readable.
      const step = classic
        ? Math.min(requestedStep, Math.max(1, size / 16))
        : Math.min(requestedStep * 0.55, Math.max(0.9, size / 24));
      const dotScale = Math.max(classic ? 0.5 : 0.4, step / requestedStep);
      const jitter = classic ? 0 : step * 0.7;
      const candidates = [];
      for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
        const alpha = pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3];
        if (alpha > 40) candidates.push({ x: x + (Math.random() - 0.5) * jitter, y: y + (Math.random() - 0.5) * jitter, alpha: alpha / 255, seed: Math.random() * 30, baseSize: dotScale });
      }
      const stride = Math.max(1, Math.ceil(candidates.length / (classic ? 6500 : 11000)));
      points = candidates.filter((_, i) => i % stride === 0);
      // Text-only sampling pool: changing its visible fraction leaves emitters intact.
      glyphPoints = points.map((point, index) => ({ ...point, textRank: (index * 0.61803398875) % 1 }));
      // Preserve existing density layers and add six distinct sub-cell samples.
      // At most 12 × 11,000 glyph particles; waterfall emitters are unchanged.
      const offsets = [[0.5, 0.5], [0.25, 0.75], [0.75, 0.25], [0.25, 0.25], [0.75, 0.75], [0.125, 0.375], [0.375, 0.125], [0.625, 0.875], [0.875, 0.625], [0.125, 0.875], [0.875, 0.125]];
      offsets.forEach(([ox, oy], layer) => {
        points.forEach((point, index) => {
          const x = point.x + step * ox;
          const y = point.y + step * oy;
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const alpha = pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3];
          if (alpha > 40) glyphPoints.push({ ...point, x, y, alpha: alpha / 255, textRank: layer + 1 + (index * 0.61803398875) % 1 });
        });
      });
      const clearance = buildDriftClearance(pixels, width, height);
      for (const point of glyphPoints) {
        point.alphaSeed = Math.random();
        point.twinklePhase = Math.random() * Math.PI * 2;
        point.twinkleRate = 1.2 + Math.random() * 3.6;
        const px = Math.floor(point.x), py = Math.floor(point.y);
        const safeDistance = px >= 0 && py >= 0 && px < width && py < height ? clearance[py * width + px] : 0;
        point.driftRadius = Math.min(5, Math.max(0, safeDistance - 1));
        point.driftRate = 0.7 + (point.seed / 30) * 1.1;
      }
      sweepBounds = { left: width, right: 0, centerY: start + (lines.length - 1) * lineHeight / 2, top: Math.max(0, Math.floor(start - lineHeight)), bottom: Math.min(height, Math.ceil(start + lines.length * lineHeight)) };
      for (const point of points) {
        const projected = point.x + (point.y - sweepBounds.centerY) * 0.25;
        sweepBounds.left = Math.min(sweepBounds.left, projected);
        sweepBounds.right = Math.max(sweepBounds.right, projected);
      }
      bursts = []; burstWait = 0;
      sweepLayer = document.createElement('canvas');
      sweepLayer.width = width; sweepLayer.height = height;
      noiseLayer = document.createElement('canvas');
      noiseLayer.width = Math.ceil(width / 4);
      noiseLayer.height = Math.max(1, Math.ceil((sweepBounds.bottom - sweepBounds.top) / 4));
      noisePixels = noiseLayer.getContext('2d').createImageData(noiseLayer.width, noiseLayer.height);
      glyphMask = offscreen; layerKey = ''; textLayerKey = ''; visibleDensity = -1;
      // Trace the actual raster silhouette, not the sparse/jittered text dots.
      // Each line emits only from its bottom-most opaque pixel in each column.
      streams = [];
      const columnStep = classic ? Math.max(2, size / 28) : Math.max(1.4, size / 36);
      lines.forEach((_, line) => {
        const center = start + line * lineHeight;
        const top = Math.max(0, Math.floor(center - lineHeight / 2));
        const bottom = Math.min(height - 1, Math.ceil(center + lineHeight / 2));
        for (let x = 0; x < width; x += columnStep) {
          const column = Math.floor(x);
          for (let y = bottom; y >= top; y--) {
            if (pixels[(y * width + column) * 4 + 3] <= 40) continue;
            const index = streams.length;
            let strokeTop = y;
            while (strokeTop > top && y - strokeTop < size * 0.2 && pixels[((strokeTop - 1) * width + column) * 4 + 3] > 40) strokeTop--;
            streams.push({ x: column + 0.5, y: strokeTop, edgeY: y + 0.5,
              blendLength: Math.max(12, size * 0.5), spacing: columnStep,
              rank: (index * 0.61803398875 + 0.005) % 1, seed: Math.random() });
            break;
          }
        }
      });
      sourceAmount = -1; updateSources();
      stars = Array.from({ length: 120 }, () => ({ x: width * (0.06 + Math.random() * 0.88), y: height * (0.04 + Math.random() * 0.85), radius: 0.65 + Math.random() * 1.15, phase: Math.random() * Math.PI * 2, rate: 0.6 + Math.random() * 1.4 }));
      drops = []; emission = 0;
      if (!reduced) for (let i = 0; i < Math.min(1200, live.current.emissionRate * 2); i++) randomDrop(true);
      draw(); restart();
    };
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; restart(); };
    const motionChange = () => { reduced = motion.matches; drops = []; cancelAnimationFrame(frame); frame = 0; draw(); restart(); };
    const observer = new ResizeObserver(sample);
    observer.observe(container);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', motionChange);
    // Redraw static/reduced-motion frames when visual controls change.
    const redraw = () => { if (reduced) draw(); };
    container.addEventListener('particle-redraw', redraw);
    const contextLost = event => { event.preventDefault(); if (gpuActive) rendererFailure(new Error('WebGL 上下文已中断，请重新切换')); };
    threeCanvas.addEventListener('webglcontextlost', contextLost);
    container.addEventListener('renderer-change', activateRenderer);
    showBackend();
    activateRenderer();
    return () => {
      disposed = true; build++; rendererRequest++; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', motionChange);
      container.removeEventListener('particle-redraw', redraw); container.removeEventListener('renderer-change', activateRenderer);
      threeCanvas.removeEventListener('webglcontextlost', contextLost);
      gpu?.dispose();
    };
  }, [text, density, fontSize, fontWeight, fontFamily, waterfallStyle, canvasWidth, canvasHeight]);
  useEffect(() => { containerRef.current?.dispatchEvent(new Event('renderer-change')); }, [renderer]);
  useEffect(() => { containerRef.current?.dispatchEvent(new Event('particle-redraw')); }, [particleDriftSpeed, particleAlphaRandom, particleAlphaVariation, particleLiveliness, particleTwinkle, particleTwinkleIntensity, particleTwinkleSpeed, particleShape, particleSizeRandom, particleSizeVariation, textSparkleBurstRate, textSparkleBurstDuration, textSparklePathRandom, textSparkleShapeRandom, textSparkleShape, textSparkleScale, textSparkleFlow, textSparkles, textSparkleAmount, textSparkleIntensity, textSparkleSpeed, textSparkleSize, color, highlightColor, underlayColor, glowColor, underlayDiffusion, glowDiffusion, particleSize, glow, brightSparkles, brightSparkleSize, backgroundStarCount, emissionRate, trailLength, trailOpacity, waterfallAmount, textParticleDensity, textUnderlay, connected, connectionStrength, trailColorMode, trailAutoFade]);
  return <div ref={containerRef} className={`particle-text waterfall-text ${className}`} style={style}>
    <canvas ref={canvasRef} className="particle-text__canvas" aria-hidden="true" />
    <canvas ref={threeCanvasRef} className="particle-text__canvas particle-text__three" aria-hidden="true" />
    <span className="particle-text__sr">{text}</span>
  </div>;
}
