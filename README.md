# Flowtype · 文字粒子实验室

React + Vite，JavaScript + 普通 CSS 的文字粒子瀑布演示页。

```sh
pnpm install
pnpm dev
pnpm build
```

打开终端显示的本地地址（默认 http://localhost:5173）。

## 组件

官方 React Bits 源码通过 `pnpm dlx shadcn@latest add @react-bits/ParticleText-JS-CSS` 安装，保留在 `src/components/ParticleTextOriginal.jsx`；原样式为 `ParticleText.css`。
来源：https://reactbits.dev/r/ParticleText-JS-CSS.json

`ParticleText.jsx` 是模式入口，默认使用官方聚散动画；传入 `mode="waterfall"` 使用独立的 `WaterfallText.jsx` 渲染器。

### Canvas 2D / Three.js 对比

右上角点击「Three.js 转译」启用 Three.js / WebGL，再点击「返回 Canvas 2D」切回原版。两者共享同一套采样点、下落粒子、动画时钟和参数，切换不重置运动，也保留暂停与固定画布状态。首次点击按需加载 Three.js；不可用时保留 Canvas 并显示提示。开发接入可设置 `renderer="three"`（默认 `"canvas"`）。

`src/lib/ThreeWaterfallRenderer.js` 使用正交相机、实例化四边形绘制粒子与闪点，并以 shader 绘制渐变拖尾。为尽量匹配原版，文字采样、缓存光帘、粒子笔刷和文字扫光遮罩仍使用离屏 Canvas 生成纹理；并非把整个 Canvas 动画贴到一个平面。画面采用原有 sRGB 混合方式，不额外加曝光、Bloom 或透视。两者在亚像素抗锯齿、笔刷插值和部分重叠顺序上可能存在细微差异。

预设和完整源码导出包含当前渲染器；旧预设仍兼容。Three.js 模块按需加载，导出的项目依赖中包含 `three`。

### 导入之前下载的源码包

左侧画布上方点击「上传 ZIP」，或将源码包拖入「导入源码 ZIP」区域。支持本站导出的完整源码包，以及外面多包一层项目文件夹的 ZIP（最大 20 MB）。导入器读取 `src/initial-preset.json`，恢复文字、效果参数、固定尺寸、播放状态和渲染器；旧包中缺少的新参数会使用默认值，没有渲染器字段时使用 Canvas 2D。

文件只在浏览器本地读取，不发送服务器，也不执行 ZIP 内的 JavaScript。预览使用当前版本的渲染器，因此不保证重现手动修改过的旧源码行为或原动画的某一帧。导入失败会显示原因并保留当前画板。导入成功后可继续调参，或点击「保存当前参数」加入本机预设。

导入格式检查：`node --test tests/importProject.test.mjs`。

```jsx
import ParticleText from './components/ParticleText';

<div style={{ height: 480, background: '#09090f' }}>
  <ParticleText
    mode="waterfall"
    text={"But I guess that's just\nthe way the story goes"}
    particleSize={2}
    density={4}
    color="#ddd0ff"
    highlightColor="#8b5cf6"
    fallSpeed={90}
    emissionRate={500}
    trailLength={120}
    paused={false}
    glow
  />
</div>
```

- `fallSpeed`：基础下落速度，px/s，默认 90。
- `textParticleDensity`：文字粒子密集度，0.1–2，默认 1（100%）；只调节字形粒子，保留瀑布发射位置、数量和当前动画进度。
- `waterfallAmount`：启用的下落粒子流比例，0–1，默认 1。两种模式均可用；0 隐藏所有瀑布线条及下落粒子，保留文字和背景闪点。不会重采样文字；`emissionRate` 独立控制总生成速率。
- `emissionRate`：每秒生成的粒子数，默认 500；同时存活最多 2600 个。
- `trailOpacity`：拖尾不透明度，0–1，默认 1；仅影响细线拖尾和柔光光帘，不改变文字、粒子头部或明亮闪点。调低时突出下落水滴感，0 时只保留粒子。
- `trailLength`：基础拖尾长度，px，默认 120。
- `waterfallStyle`：`curtain`（默认，柔光瀑布）或 `classic`（细线瀑布）。右侧模式切换保留现有文案、参数和暂停状态；重置恢复默认柔光模式。
- `brightSparkles`：开启明亮闪点，默认 true；关闭后保留基础文字、紫色光帘和普通下落粒子。与文字阴影独立控制。
- `paused`：冻结当前画面，默认 false。
- 瀑布模式支持换行；尺寸、字体和文案改变时重新采样，运动及颜色参数实时生效。
- 瀑布模式忽略原组件的 `trigger`、`scatter`、`gatherDuration`、`stagger`、`pointerRepel`、`repelRadius`、`idleDrift`。
- 页面隐藏时停止动画；尊重系统减少动态效果设置，仅显示静态字形。Canvas 文本另有屏幕阅读器文本。
- 未保存的当前设置刷新后恢复默认。画布下方的“参数预设”支持命名保存多个版本、查看全部数值、一键恢复、删除，以及复制或导出开发用 JSON。预设包含所有效果参数、固定画布尺寸与播放状态。
- 预设使用当前浏览器的 localStorage 持久化，刷新后仍可读取；不同浏览器、设备或网站地址之间不共享，清除网站数据会移除记录。可导出 JSON 留作备份与开发参考。存储不可用时页面会明确提示，并保留本次会话中的记录供导出。

右侧“文字底色”的“开底色 / 关底色”控制 `textUnderlay`（默认 true），仅用于原本含文字底板的柔光模式。开启保留原来的半透明实心字形，关闭仅绘制字形粒子，不改变瀑布运动或光晕设置。

“文字光晕”独立控制 `glow`，保留原来的文字边缘柔和发光。细线模式本身没有实心底板。

两种瀑布模式均沿每行文字真实轮廓的最下边缘发射，拖尾在离开字底前保持衔接，文字底板与光晕开关继续独立保留。

`connected`（默认 true）切换连接/不连接。`connectionStrength`（默认 1，范围 0–1）控制字底过渡的深度、长度和亮度；0 与不连接相同。不连接时禁用强度滑块但保留数值，再次连接恢复原强度。调节不重新采样字形，两种模式都可用。

`trailColorMode`：`gradient`（默认）混合文字与粒子颜色，`solid` 仅使用粒子颜色。`trailAutoFade` 默认 true；关闭时拖尾、光帘和连接线不再按寿命/距离自动淡出或随机变暗，仍服从拖尾不透明度和连接强度。粒子头部、明亮闪点、文字光晕独立保留。两种模式均支持，重置恢复原来的渐变渐隐效果。

## 线上发布

- 站点：https://flowtype-particles.pages.woa.com/
- 平台：OA Pages，API 模式；访问权限保持 iOA 登录验证（tof）。
- 官方接口说明：https://pages.woa.com/skill.md
- 运行 `pnpm build` 后，将 `dist` 的静态资源通过 `PUT /api/sites/flowtype-particles.pages.woa.com` 增量上传，先上传 assets，再更新 index.html。鉴权使用本机 `OA_PAGES_API_KEY` 环境变量，禁止写入项目。
- `docs` 已同步最新发布构建。保留旧 hash 资源，避免已打开页面引用失效。

左侧“开启固定尺寸 1356 × 932”按钮切换固定画布：实际 Canvas 为 1356×932 像素，页面仅等比例缩放预览，字体按固定画布及文案长度适配。再次点击恢复容器自适应；保留现有参数和暂停状态。组件对应 `canvasWidth`、`canvasHeight` 属性。

### 完整源码导出

参数预设区域可导出当前画板或指定预设的完整源码 ZIP，包含 React/Vite 项目、依赖锁文件、所有粒子组件、控制面板和 examples/CanvasExample.jsx。解压后运行 pnpm install 与 pnpm dev，自动读取 src/initial-preset.json 中的参数、画布尺寸及播放状态。源码取导出时的网站版本，不包含其他浏览器预设或动画逐帧状态。
