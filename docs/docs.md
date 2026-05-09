# 文档

## 安装

```bash
pnpm add viewer-pro
```

也可以用 `npm install viewer-pro` / `yarn add viewer-pro`。样式内联在构建产物里，无需单独引入 CSS。

## 快速上手

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  { src: 'https://example.com/1.jpg', thumbnail: 'https://example.com/1-s.jpg', title: '图片 1' },
  { src: 'https://example.com/2.jpg', thumbnail: 'https://example.com/2-s.jpg', title: '图片 2' },
]

const viewer = new ViewerPro({ images })
viewer.open(0)
```

Vue、React 等框架里，自己渲染图片列表，点击时调用 `viewer.open(index)` 即可。

### 使用 init() 自动绑定

如果你用原生 HTML，给图片容器加上 `.viewer-pro-item` 类名，调用 `init()` 即可自动绑定点击打开预览：

```html
<div class="viewer-pro-item"><img src="thumb1.jpg" /></div>
<div class="viewer-pro-item"><img src="thumb2.jpg" /></div>
```

```typescript
const viewer = new ViewerPro({ images })
viewer.init() // 自动按 DOM 顺序绑定点击 → open(index)
```

选择器可通过 `itemSelector` 自定义：

```typescript
const viewer = new ViewerPro({ images, itemSelector: '.my-gallery-item' })
viewer.init()
```

### 完整 HTML 示例

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

  <script src="https://fastly.jsdelivr.net/npm/viewer-pro@latest/dist/ViewerPro.js"></script>
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

## API

```typescript
const viewer = new ViewerPro(options?: ViewerProOptions)
```

### 实例方法

| 方法 | 说明 |
| --- | --- |
| `open(index)` | 打开指定索引的预览 |
| `close()` | 关闭预览 |
| `addImages(images)` | 替换图片列表（不会立即请求缩略图） |
| `getState()` | 获取当前 scale / translate / rotation / index / image |
| `onTransform(listener)` | 订阅变换状态变化，返回取消订阅函数 |
| `notifyContentReady()` | 手动通知内容就绪（自定义渲染场景） |
| `closeLoading()` | 手动关闭 loading |
| `showInfoPanel()` / `hideInfoPanel()` / `toggleInfo()` | 控制信息面板 |
| `showThumbnails()` / `hideThumbnails()` / `toggleThumbnailNav()` | 控制缩略图导航 |
| `setTheme(theme)` / `getTheme()` | 设置/获取主题 `'dark' \| 'light' \| 'auto'` |
| `setZoomConfig(config)` / `getZoomConfig()` | 设置/获取缩放配置 |
| `destroy()` | 销毁实例，清理事件和资源 |
| `init()` | 可选。自动给 `itemSelector` 匹配的元素绑定点击事件（默认 `.viewer-pro-item`）；框架中推荐直接 `open(index)` |

### 键盘快捷键

预览器激活时有效（`keyboardShortcuts: false` 可关闭）：

| 按键 | 功能 |
| --- | --- |
| `Esc` | 关闭预览（信息面板打开时先关面板） |
| `←` / `→` | 上一张 / 下一张 |
| `+` / `=` | 放大 |
| `-` | 缩小 |
| `0` | 重置缩放 |
| `f` | 全屏 |
| `d` | 下载 |

## 配置

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'auto',               // 'dark' | 'light' | 'auto'
  backend: 'auto',             // 'auto' | 'css' | 'webgl'
  webglFiltering: 'linear',    // 'linear' | 'nearest'
  keyboardShortcuts: true,
  mobileSwipeToNavigate: true,
  mobileToolbar: ['zoomIn', 'zoomOut', 'reset', 'thumbnails', 'info'],
  preloadAdjacent: false,
  preloadCacheLimit: 5,
  zoomConfig: { min: 0.5, max: 5, step: 0.3 },
  swipeConfig: { maxDistance: 120, viewportRatio: 0.25, axisLockRatio: 1.2 },
})
```

想在线调整并实时预览效果，打开 [配置实验台](/playground)。

## 自定义扩展

### 自定义 Loading

```typescript
new ViewerPro({
  images,
  loadingNode: (item) => ({
    node: buildLoadingNode(item),
    done: (ctx) => {
      ctx.onImageLoaded(() => ctx.closeLoading())
      ctx.onImageError(() => ctx.closeLoading())
    },
  }),
})
```

`done(context)` 暴露：`getImageLoadingStatus()`、`getMediaLoadingStatus()`、`onImageLoaded()`、`onImageError()`、`getCurrentImage()`、`closeLoading()`。

### 自定义渲染

`renderNode` 完全接管预览 DOM。缩放/位移/旋转需要自己在 `onTransformChange` 里同步：

```typescript
new ViewerPro({
  images,
  renderNode: (item, index) => {
    const box = document.createElement('div')
    box.id = `render-${index}`
    const img = document.createElement('img')
    img.src = item.src
    box.appendChild(img)
    return box
  },
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    const el = document.getElementById(`render-${index}`)
    if (el) el.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale}) rotate(${rotation}deg)`
  },
})
```

BlurHash 占位、Live Photo 等完整示例见 [Live Photo 与 BlurHash](/live-photo)。

### 自定义信息面板

```typescript
new ViewerPro({
  images,
  infoRender: (item, index) => {
    const el = document.createElement('div')
    el.innerHTML = `<div>标题：${item.title || '-'}</div><div>索引：${index + 1}</div>`
    return el
  },
})

viewer.showInfoPanel()
viewer.hideInfoPanel()
viewer.toggleInfo()
```

## 类型定义

### ViewerItem

```typescript
interface ViewerItem {
  src: string
  thumbnail?: string
  title?: string
  type?: string
  photoSrc?: string
  videoSrc?: string
  [key: string]: any
}
```

### ViewerProOptions


```typescript
interface ViewerProOptions {
  images?: ViewerItem[]
  loadingNode?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement | LoadingNodeResult)
  renderNode?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
  infoRender?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
  theme?: 'dark' | 'light' | 'auto'
  zoomConfig?: ZoomConfig
  backend?: 'auto' | 'css' | 'webgl'
  webglFiltering?: 'linear' | 'nearest'
  toolbar?: ToolbarAction[]
  mobileToolbar?: ToolbarAction[]
  mobileSwipeToNavigate?: boolean
  swipeConfig?: SwipeConfig
  preloadAdjacent?: boolean
  preloadCacheLimit?: number
  keyboardShortcuts?: boolean
  itemSelector?: string
  onImageLoad?: (item: ViewerItem, idx: number) => void
  onContentReady?: (item: ViewerItem, idx: number) => void
  onTransformChange?: (state: TransformChangeState) => void
  onOpen?: (item: ViewerItem, idx: number) => void
  onClose?: () => void
  onIndexChange?: (item: ViewerItem, idx: number) => void
  onInfoPanelOpen?: (item: ViewerItem, idx: number) => void
  onInfoPanelClose?: (item: ViewerItem, idx: number) => void
}
```

| 选项 | 说明 | 默认值 |
| --- | --- | --- |
| images | 预览项数组 | `[]` |
| loadingNode | 自定义 loading 节点或工厂函数 | - |
| renderNode | 自定义预览内容渲染节点 | - |
| infoRender | 自定义信息面板渲染节点 | - |
| theme | 主题模式 | `'dark'` |
| backend | 渲染后端 | `'auto'` |
| webglFiltering | WebGL 纹理过滤 | `'linear'` |
| toolbar | 桌面端工具栏按钮 | 全部 |
| mobileToolbar | 移动端工具栏按钮 | 部分 |
| mobileSwipeToNavigate | 移动端滑动切换 | `true` |
| preloadAdjacent | 预加载相邻原图 | `false` |
| preloadCacheLimit | 预加载缓存上限 | `5` |
| keyboardShortcuts | 键盘快捷键 | `true` |
| itemSelector | `init()` 绑定点击的 CSS 选择器 | `'.viewer-pro-item'` |

### 事件回调

| 回调 | 说明 |
| --- | --- |
| onImageLoad | 图片加载完成 |
| onContentReady | 内容就绪（自定义渲染场景） |
| onTransformChange | 缩放/位移/旋转/索引变化 |
| onOpen | 预览打开 |
| onClose | 预览关闭 |
| onIndexChange | 索引变化 |
| onInfoPanelOpen / onInfoPanelClose | 信息面板打开/关闭 |

### ZoomConfig

```typescript
interface ZoomConfig {
  min?: number              // 最小缩放
  max?: number              // 最大缩放
  step?: number             // 按钮步长
  wheelBaseStep?: number    // 滚轮基础步长
  wheelMaxStep?: number     // 滚轮最大步长
  wheelSpeedMultiplier?: number // 速度系数
}
```

### SwipeConfig

```typescript
interface SwipeConfig {
  maxDistance?: number       // 触发切换的最大距离
  viewportRatio?: number    // 触发比例（相对视口宽度）
  axisLockRatio?: number    // 轴锁定比例
}
```

### TransformChangeState

```typescript
interface TransformChangeState {
  scale: number
  translateX: number
  translateY: number
  rotation: number
  index: number
  image: ViewerItem | null
}
```

### LoadingContext

```typescript
interface LoadingContext {
  getImageLoadingStatus: () => Promise<{ loaded: boolean; error?: string }>
  getMediaLoadingStatus: () => Promise<{ images: boolean[]; videos: boolean[]; audios: boolean[] }>
  onImageLoaded: (callback: () => void) => void
  onImageError: (callback: (error: string) => void) => void
  getCurrentImage: () => { image: ViewerItem; index: number }
  closeLoading: () => void
}
```

### ToolbarAction

```typescript
type ToolbarAction = 'zoomIn' | 'zoomOut' | 'reset' | 'rotateLeft' | 'rotateRight' | 'thumbnails' | 'fullscreen' | 'download' | 'info'
```
