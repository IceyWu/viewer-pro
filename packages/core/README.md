# viewer-pro

<p>
  <a href="https://www.npmjs.com/package/viewer-pro"><img src="https://img.shields.io/npm/v/viewer-pro.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/viewer-pro"><img src="https://img.shields.io/npm/dm/viewer-pro.svg" alt="monthly downloads"></a>
  <a href="https://www.npmjs.com/package/viewer-pro"><img src="https://img.shields.io/npm/dt/viewer-pro.svg" alt="total downloads"></a>
  <a href="https://bundlephobia.com/package/viewer-pro"><img src="https://img.shields.io/bundlephobia/minzip/viewer-pro" alt="bundle size"></a>
  <a href="https://github.com/iceywu/viewer-pro/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/viewer-pro.svg" alt="license"></a>
  <a href="https://github.com/iceywu/viewer-pro"><img src="https://img.shields.io/github/stars/iceywu/viewer-pro?style=social" alt="github stars"></a>
</p>

现代化的图片预览组件，框架无关、零依赖。

## 特性

- 🖼️ **图片预览** — 缩放、拖拽、旋转、切换、全屏、下载
- 🎯 **缩略图导航** — 首次打开后按需渲染，可视区域懒加载，大图集友好
- ⚙️ **自定义扩展** — `loadingNode` / `renderNode` / `infoRender` 三个扩展点
- 🎭 **主题系统** — 深色 / 浅色 / 自动，运行时可切换
- 🚀 **双渲染后端** — CSS 或 WebGL，按图片尺寸自动选择
- 📱 **移动端适配** — 可配置工具栏、左右滑动切换、手势缩放
- ⌨️ **键盘快捷键** — Esc / 方向键 / +- / f / d 等
- 🧩 **框架无关** — 原生 JS / Vue / React / Angular，UMD + ESM + CJS

## 安装

```bash
pnpm add viewer-pro
```

CSS 已内联，无需单独引入样式。

## 使用

```typescript
import { ViewerPro } from 'viewer-pro'

const viewer = new ViewerPro({
  images: [
    { src: 'https://example.com/1.jpg', thumbnail: 'https://example.com/1-s.jpg', title: '图片 1' },
  ]
})

viewer.open(0)
```

### 原生 HTML

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ViewerPro Demo</title>
  <style>
    .image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 700px; }
    .viewer-pro-item { cursor: pointer; border-radius: 8px; overflow: hidden; }
    .viewer-pro-item img { width: 100%; height: 140px; object-fit: cover; display: block; }
  </style>
</head>
<body>
  <div class="image-grid">
    <div class="viewer-pro-item"><img src="https://picsum.photos/seed/120/240/160" /></div>
    <div class="viewer-pro-item"><img src="https://picsum.photos/seed/121/240/160" /></div>
    <div class="viewer-pro-item"><img src="https://picsum.photos/seed/122/240/160" /></div>
  </div>

  <script src="https://unpkg.com/viewer-pro/dist/ViewerPro.js"></script>
  <script>
    const viewer = new ViewerPro({
      images: [
        { src: "https://picsum.photos/seed/120/1200/800", thumbnail: "https://picsum.photos/seed/120/240/160", title: "图片 1" },
        { src: "https://picsum.photos/seed/121/1200/800", thumbnail: "https://picsum.photos/seed/121/240/160", title: "图片 2" },
        { src: "https://picsum.photos/seed/122/1200/800", thumbnail: "https://picsum.photos/seed/122/240/160", title: "图片 3" },
      ]
    });
    viewer.init();
  </script>
</body>
</html>
```

`init()` 自动给 `.viewer-pro-item` 绑定点击，可通过 `itemSelector` 自定义。

## API

| 方法 | 说明 |
| --- | --- |
| `open(index)` | 打开预览 |
| `close()` | 关闭预览 |
| `addImages(images)` | 替换图片列表 |
| `init()` | 自动绑定 `itemSelector` 元素的点击事件（默认 `.viewer-pro-item`） |
| `showInfoPanel()` / `hideInfoPanel()` / `toggleInfo()` | 信息面板 |
| `showThumbnails()` / `hideThumbnails()` / `toggleThumbnailNav()` | 缩略图导航 |
| `setTheme(theme)` / `getTheme()` | 主题 |
| `setZoomConfig(config)` / `getZoomConfig()` | 缩放配置 |
| `getState()` | 当前状态（scale / translate / rotation / index） |
| `onTransform(listener)` | 订阅变换状态，返回取消函数 |
| `notifyContentReady()` / `closeLoading()` | 自定义渲染/loading 流程控制 |
| `destroy()` | 销毁实例 |

## 文档

[viewer-pro.netlify.app](https://viewer-pro.netlify.app/)

## License

MIT © [Icey Wu](https://github.com/iceywu)
