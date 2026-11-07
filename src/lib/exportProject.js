import { zipSync, strToU8 } from 'fflate';
import exporterSource from './exportProject.js?raw';

// Raw imports include only project source/configuration, never browser storage or secrets.
const sources = import.meta.glob('/src/**/*.{jsx,js,css,json}', { query: '?raw', import: 'default', eager: true });
const config = import.meta.glob(['../../package.json', '../../pnpm-lock.yaml', '../../pnpm-workspace.yaml', '../../vite.config.js', '../../index.html', '../../jsconfig.json', '../../components.json'], { query: '?raw', import: 'default', eager: true });

export function buildProjectArchive(preset) {
  const files = { 'src/lib/exportProject.js': exporterSource };
  for (const [path, content] of Object.entries(sources)) files[path.slice(1)] = content;
  for (const [path, content] of Object.entries(config)) files[path.replace('../../', '')] = content;
  files['src/initial-preset.json'] = JSON.stringify(preset, null, 2);
  files['.gitignore'] = 'node_modules/\ndist/\n.DS_Store\n';
  files['examples/CanvasExample.jsx'] = `import ParticleText from '../src/components/ParticleText';
import preset from '../src/initial-preset.json';

// Copy components/, lib/ThreeWaterfallRenderer.js and this preset; install three.
export default function CanvasExample() {
  const fixed = preset.fixedCanvas;
  return <div style={{ width: '100%', height: fixed ? undefined : 600, aspectRatio: fixed ? '1356 / 932' : undefined, background: '#09090f', position: 'relative' }}>
    <ParticleText mode="waterfall" {...preset.settings} renderer={preset.renderer || 'canvas'} density={4} fontWeight={800}
      fontSize={fixed ? 128 : 'clamp(3rem, 8vw, 6rem)'}
      canvasWidth={fixed ? 1356 : undefined} canvasHeight={fixed ? 932 : undefined}
      paused={preset.paused} />
  </div>;
}
`;
  files['README.md'] = `# Flowtype 完整源码项目

包含完整画板、右侧效果调节、参数预设、粒子渲染组件及独立画布示例。
启动时自动载入本次导出的文案、效果参数、渲染器、画布尺寸和暂停状态。
右上角“Three.js 转译”切换到 WebGL，再次点击可返回 Canvas 2D 对比。

## 运行

使用 Node.js 22.12+ 和 pnpm。在解压目录执行：

\`\`\`sh
pnpm install
pnpm dev
\`\`\`

打开终端显示的本地地址。生产构建：\`pnpm build\`。
若保存时处于暂停状态，点击“继续播放”开始动画。

## 文件

- src/initial-preset.json：这次导出的完整参数快照。
- src/App.jsx：完整画板和控制面板。
- src/components/WaterfallText.jsx：瀑布、底色、光晕等效果源码。
- src/lib/ThreeWaterfallRenderer.js：Three.js 实例化粒子与渐变拖尾渲染器。
- src/components/ParticleTextOriginal.jsx：React Bits 原始动画组件。
- examples/CanvasExample.jsx：只嵌入画布的最小使用示例。

组件基于 React Bits ParticleText（https://reactbits.dev/text-animations/particle-text）改造。
源码为导出时的网站版本；参数为所选预设的保存值。动画实时生成，不是视频或逐帧快照。
压缩包不包含浏览器内的其他预设。导出后可离线保存源码，首次安装依赖需要网络。
`;
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)])), { level: 6 });
}

export function downloadProject(preset) {
  const bytes = buildProjectArchive(preset);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `flowtype-source-${preset.name.replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 50) || 'canvas'}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
