import {
  WebGLRenderer, Scene, OrthographicCamera, InstancedBufferGeometry,
  BufferAttribute, InstancedBufferAttribute, DynamicDrawUsage, Mesh,
  ShaderMaterial, CanvasTexture, LinearFilter, CustomBlending,
  OneFactor, OneMinusSrcAlphaFactor, AddEquation, DoubleSide,
} from 'three';

// Coordinates and blending deliberately match Canvas 2D: CSS pixels, top-left
// origin, premultiplied sRGB values, no lighting or tone mapping. Canvas is used
// only to prepare reusable glyph/brush textures; live particles are GPU quads.
const vertexShader = `
  attribute vec4 rect;
  attribute vec4 atlasUV;
  attribute float opacity;
  varying vec2 vUV;
  varying float vOpacity;
  void main() {
    vUV = mix(atlasUV.xy, atlasUV.zw, position.xy);
    vOpacity = opacity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(rect.xy + position.xy * rect.zw, 0., 1.);
  }
`;
const fragmentShader = `
  uniform sampler2D map;
  varying vec2 vUV;
  varying float vOpacity;
  void main() {
    gl_FragColor = texture2D(map, vec2(vUV.x, 1. - vUV.y)) * vOpacity;
  }
`;
const trailVertex = `
  attribute vec4 rect;
  attribute vec4 startColor;
  attribute vec4 middleColor;
  attribute vec4 endColor;
  attribute vec2 lineInfo;
  varying vec2 vPosition;
  varying vec2 vSize;
  varying vec4 vStart;
  varying vec4 vMiddle;
  varying vec4 vEnd;
  varying vec2 vLine;
  void main() {
    vPosition = position.xy * rect.zw;
    vSize = rect.zw;
    vStart = startColor; vMiddle = middleColor; vEnd = endColor;
    vLine = lineInfo;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(rect.xy + vPosition, 0., 1.);
  }
`;
const trailFragment = `
  uniform float dpr;
  varying vec2 vPosition;
  varying vec2 vSize;
  varying vec4 vStart;
  varying vec4 vMiddle;
  varying vec4 vEnd;
  varying vec2 vLine;
  float coverage(float pixel, float lo, float hi) {
    return clamp(min(hi, pixel + .5) - max(lo, pixel - .5), 0., 1.);
  }
  void main() {
    float t = clamp((vPosition.y - 1. / dpr) / max(.001, vSize.y - 2. / dpr), 0., 1.);
    vec4 color = t < vLine.y ? mix(vStart, vMiddle, t / vLine.y)
      : mix(vMiddle, vEnd, (t - vLine.y) / (1. - vLine.y));
    float a = coverage(vPosition.x * dpr, 1., 1. + vLine.x * dpr)
      * coverage(vPosition.y * dpr, 1., vSize.y * dpr - 1.);
    gl_FragColor = color * a;
  }
`;

function material(vertex, fragment, uniforms, additive = false) {
  return new ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms,
    transparent: true, depthTest: false, depthWrite: false, side: DoubleSide,
    toneMapped: false, blending: CustomBlending,
    blendEquation: AddEquation, blendSrc: OneFactor,
    blendDst: additive ? OneFactor : OneMinusSrcAlphaFactor,
    blendEquationAlpha: AddEquation, blendSrcAlpha: OneFactor,
    blendDstAlpha: additive ? OneFactor : OneMinusSrcAlphaFactor,
  });
}
function texture(canvas) {
  const map = new CanvasTexture(canvas);
  map.premultiplyAlpha = true;
  map.generateMipmaps = false;
  map.minFilter = map.magFilter = LinearFilter;
  return map;
}
class Batch {
  constructor(scene, order, capacity, sizes, mat) {
    this.capacity = capacity;
    this.count = 0;
    this.geometry = new InstancedBufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), 3));
    this.geometry.setIndex([0, 1, 2, 2, 1, 3]);
    this.attributes = Object.fromEntries(Object.entries(sizes).map(([key, size]) => {
      const attribute = new InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(DynamicDrawUsage);
      this.geometry.setAttribute(key, attribute);
      return [key, attribute];
    }));
    this.mesh = new Mesh(this.geometry, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    scene.add(this.mesh);
  }
  add(values) {
    if (this.count >= this.capacity) return;
    for (const [key, value] of Object.entries(values)) {
      const a = this.attributes[key];
      a.array.set(value, this.count * a.itemSize);
    }
    this.count++;
  }
  upload() {
    this.mesh.visible = this.count > 0;
    this.geometry.instanceCount = this.count;
    if (!this.count) return;
    for (const a of Object.values(this.attributes)) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.count * a.itemSize);
      a.needsUpdate = true;
    }
  }
  dispose() { this.geometry.dispose(); this.mesh.material.dispose(); }
}

export default class ThreeWaterfallRenderer {
  constructor(canvas) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new Scene();
    this.camera = new OrthographicCamera(0, 1, 0, 1, -1, 1);
    this.atlas = document.createElement('canvas');
    this.atlas.width = this.atlas.height = 2048;
    this.atlasContext = this.atlas.getContext('2d');
    this.atlasTexture = texture(this.atlas);
    this.sprites = new Map();
    this.colors = new Map();
    this.layers = new Map();
    this.batches = new Map();
    this.dpr = 1;
    this.resetAtlas();
    const orders = { heads: 3, dropStars: 4, glyphs: 5, connections: 7, stars: 9 };
    for (const [name, order] of Object.entries(orders)) {
      this.batches.set(name, new Batch(this.scene, order, name === 'glyphs' ? 132000 : name === 'connections' ? 12000 : 8000,
        { rect: 4, atlasUV: 4, opacity: 1 }, material(vertexShader, fragmentShader, { map: { value: this.atlasTexture } })));
    }
    this.trails = new Batch(this.scene, 2, 2600,
      { rect: 4, startColor: 4, middleColor: 4, endColor: 4, lineInfo: 2 },
      material(trailVertex, trailFragment, { dpr: { value: 1 } }));
  }
  resetAtlas() {
    this.atlasContext.clearRect(0, 0, this.atlas.width, this.atlas.height);
    this.sprites.clear();
    this.atlasX = this.atlasY = this.rowHeight = 0;
    this.atlasDirty = true;
  }
  resize(width, height, dpr) {
    this.width = width; this.height = height;
    if (this.dpr !== dpr) this.resetAtlas();
    this.dpr = dpr;
    this.camera.right = width; this.camera.bottom = height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.trails.mesh.material.uniforms.dpr.value = dpr;
  }
  begin(p) {
    const key = [p.particleShape, p.particleSize, p.particleSizeRandom, p.particleSizeVariation,
      p.color, p.highlightColor, p.glowColor, p.glow, p.glowDiffusion].join('|');
    if (this.appearance !== key) { this.appearance = key; this.resetAtlas(); this.colors.clear(); }
    this.randomSize = p.particleSizeRandom;
    for (const b of this.batches.values()) b.count = 0;
    this.trails.count = 0;
    for (const l of this.layers.values()) l.batch.count = 0;
  }
  stamp(key, logicalWidth, logicalHeight, paint) {
    if (this.sprites.has(key)) return this.sprites.get(key);
    const w = Math.ceil(logicalWidth * this.dpr), h = Math.ceil(logicalHeight * this.dpr);
    if (this.atlasX + w + 2 > this.atlas.width) { this.atlasX = 0; this.atlasY += this.rowHeight + 2; this.rowHeight = 0; }
    if (this.atlasY + h + 2 > this.atlas.height) throw new Error('Particle texture atlas is full');
    const brush = document.createElement('canvas');
    brush.width = w; brush.height = h;
    const c = brush.getContext('2d');
    c.setTransform(this.dpr, 0, 0, this.dpr, w / 2, h / 2);
    paint(c);
    this.atlasContext.drawImage(brush, this.atlasX, this.atlasY);
    const stamp = { width: w / this.dpr, height: h / this.dpr,
      uv: [this.atlasX / 2048, this.atlasY / 2048, (this.atlasX + w) / 2048, (this.atlasY + h) / 2048] };
    this.atlasX += w + 2; this.rowHeight = Math.max(this.rowHeight, h);
    this.sprites.set(key, stamp); this.atlasDirty = true;
    return stamp;
  }
  sprite(group, x, y, stamp, alpha) {
    if (alpha <= 0) return;
    this.batches.get(group).add({ rect: [x - stamp.width / 2, y - stamp.height / 2, stamp.width, stamp.height], atlasUV: stamp.uv, opacity: [Math.min(1, alpha)] });
  }
  particle(group, x, y, size, shape, color, alpha, blur = 0, glowColor = color) {
    if (alpha <= 0 || size <= 0) return;
    // Quantize only the optional continuously-random sizes to bound atlas memory.
    const s = this.randomSize ? Math.max(.125, Math.round(size * 8) / 8) : size;
    const padding = (blur * 2 + 2) / this.dpr;
    const stamp = this.stamp(['dot', s, shape, color, blur, glowColor].join('|'), s + padding * 2, s + padding * 2, c => {
      c.fillStyle = color; c.shadowColor = glowColor; c.shadowBlur = blur;
      const r = s / 2;
      if (shape === 'circle') { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); }
      else if (shape === 'diamond' || shape === 'star') {
        c.beginPath();
        const count = shape === 'star' ? 10 : 4;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
          const radius = shape === 'star' && i % 2 ? r * .45 : r;
          c.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        c.closePath(); c.fill();
      } else c.fillRect(-r, -r, s, s);
    });
    this.sprite(group, x, y, stamp, alpha);
  }
  sparkle(group, x, y, radius, alpha, color, highlight) {
    if (alpha <= 0) return;
    const r = Math.round(radius * 20) / 20;
    const halo = this.stamp(['halo', r, color, highlight].join('|'), r * 10 + 2, r * 10 + 2, c => {
      const gradient = c.createRadialGradient(0, 0, 0, 0, 0, r * 5);
      gradient.addColorStop(0, color); gradient.addColorStop(.18, highlight); gradient.addColorStop(1, 'transparent');
      c.fillStyle = gradient; c.fillRect(-r * 5, -r * 5, r * 10, r * 10);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r * .65, 0, Math.PI * 2); c.fill();
    });
    this.sprite(group, x, y, halo, alpha);
    if (alpha > .65) {
      const cross = this.stamp(`cross|${r}`, r * 4 + 2, r * 5 + 2, c => {
        c.fillStyle = '#fff'; c.fillRect(-r * 2, -.3, r * 4, .6); c.fillRect(-.3, -r * 2.5, .6, r * 5);
      });
      this.sprite(group, x, y, cross, alpha * .45);
    }
  }
  rgba(css, alpha) {
    if (css === 'transparent') return [0, 0, 0, 0];
    if (!this.colors.has(css)) {
      // Resolve CSS colors once, preserving Canvas's sRGB working values.
      const c = document.createElement('canvas').getContext('2d');
      c.fillStyle = css; c.fillRect(0, 0, 1, 1);
      const data = c.getImageData(0, 0, 1, 1).data;
      this.colors.set(css, [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255]);
    }
    const [r, g, b, a] = this.colors.get(css), opacity = Math.max(0, Math.min(1, alpha)) * a;
    return [r * opacity, g * opacity, b * opacity, opacity];
  }
  trail(x, top, bottom, width, start, middle, end, midpoint, alpha) {
    const pad = 1 / this.dpr;
    this.trails.add({ rect: [x - width / 2 - pad, top - pad, width + pad * 2, bottom - top + pad * 2],
      startColor: this.rgba(start, alpha), middleColor: this.rgba(middle, alpha), endColor: this.rgba(end, alpha), lineInfo: [width, midpoint] });
  }
  layer(name, source, alpha, { blur = 0, color = '#fff', dynamic = false, additive = false } = {}) {
    const orders = { underlay: 0, curtain: 1, glyphGlow: 4.5, root: 6, sweep: 8 };
    let layer = this.layers.get(name);
    const key = `${blur}|${color}|${this.dpr}`;
    if (!layer || layer.source !== source || layer.key !== key) {
      if (layer) { this.scene.remove(layer.batch.mesh); layer.batch.dispose(); layer.map.dispose(); }
      let image = source;
      if (blur > 0) {
        image = document.createElement('canvas');
        image.width = Math.round(this.width * this.dpr); image.height = Math.round(this.height * this.dpr);
        const c = image.getContext('2d'); c.scale(this.dpr, this.dpr);
        c.shadowColor = color; c.shadowBlur = blur; c.drawImage(source, 0, 0);
      }
      const map = texture(image);
      const batch = new Batch(this.scene, orders[name], 1, { rect: 4, atlasUV: 4, opacity: 1 },
        material(vertexShader, fragmentShader, { map: { value: map } }, additive));
      layer = { source, key, map, batch }; this.layers.set(name, layer);
    }
    if (dynamic) layer.map.needsUpdate = true;
    layer.batch.add({ rect: [0, 0, this.width, this.height], atlasUV: [0, 0, 1, 1], opacity: [alpha] });
  }
  render() {
    if (this.renderer.getContext().isContextLost()) throw new Error('WebGL 正在恢复，请稍后重试');
    if (this.atlasDirty) { this.atlasTexture.needsUpdate = true; this.atlasDirty = false; }
    for (const b of this.batches.values()) b.upload();
    this.trails.upload();
    for (const l of this.layers.values()) l.batch.upload();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    for (const b of this.batches.values()) b.dispose();
    this.trails.dispose(); this.atlasTexture.dispose();
    for (const l of this.layers.values()) { l.batch.dispose(); l.map.dispose(); }
    this.renderer.dispose();
  }
}
