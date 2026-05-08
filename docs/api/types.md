# 类型定义

ViewerPro 的 TypeScript 类型定义。

## ViewerItem

预览项接口。除了固定字段外，可以附加任意业务字段，例如 `blurhash`、EXIF、地理位置或 Live Photo 元数据。

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

### ViewerItem 示例

```typescript
const image: ViewerItem = {
  src: 'https://example.com/image.jpg',
  thumbnail: 'https://example.com/thumb.jpg',
  title: '美丽的风景',
  type: 'photo',
  blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH'
}
```

## ViewerProOptions

ViewerPro 构造函数配置。

如果想先看属性效果，可以打开 [配置属性演示](/api/options)，该页面把常用属性、代码片段和可交互 Demo 放在一起。

```typescript
interface ViewerProOptions {
  images?: ViewerItem[]
  loadingNode?: HTMLElement | (() => HTMLElement) | ((item: ViewerItem, idx: number) => HTMLElement | LoadingNodeResult)
  renderNode?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
  infoRender?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
  theme?: 'dark' | 'light' | 'auto'
  zoomConfig?: ZoomConfig
  backend?: 'auto' | 'css' | 'webgl'
  webglFiltering?: 'linear' | 'nearest'
  mobileToolbar?: ToolbarAction[]
  mobileSwipeToNavigate?: boolean
  swipeConfig?: SwipeConfig
  preloadAdjacent?: boolean
  preloadCacheLimit?: number
  keyboardShortcuts?: boolean
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

### 数据和渲染选项

| 选项 | 说明 | 默认值 |
| --- | --- | --- |
| images | 预览项数组；只保存数据，不会立即请求缩略图 | `[]` |
| loadingNode | 自定义 loading 节点或工厂函数 | - |
| renderNode | 自定义预览内容渲染节点 | - |
| infoRender | 自定义信息面板渲染节点 | - |

`images` 在构造函数或 `addImages()` 中传入时不会立即创建缩略图请求；缩略图导航会在首次 `open(index)` 后渲染，并按当前索引附近与可视区域懒加载。

### 外观和交互选项

| 选项 | 说明 | 默认值 |
| --- | --- | --- |
| theme | 主题模式：`dark`、`light`、`auto` | `dark` |
| zoomConfig | 缩放配置 | 默认缩放配置 |
| backend | 渲染后端：`auto`、`css`、`webgl` | `auto` |
| webglFiltering | WebGL 纹理过滤方式 | - |
| mobileToolbar | 移动端工具栏按钮列表 | 默认移动端按钮 |
| mobileSwipeToNavigate | 移动端是否启用左右滑动切换 | `true` |
| swipeConfig | 滑动切换阈值配置 | 默认滑动配置 |
| preloadAdjacent | 是否预加载当前预览项相邻原图 | `false` |
| preloadCacheLimit | 相邻原图预加载缓存上限 | 默认缓存上限 |
| keyboardShortcuts | 是否启用键盘快捷键 | `true` |

### 事件回调

| 选项 | 说明 |
| --- | --- |
| onImageLoad | 当前预览项图片加载完成后触发 |
| onContentReady | 预览内容就绪后触发，适合自定义渲染场景 |
| onTransformChange | 缩放、位移、旋转、索引等状态变化时触发 |
| onOpen | 预览打开后触发 |
| onClose | 预览关闭后触发 |
| onIndexChange | 当前索引变化后触发 |
| onInfoPanelOpen | 信息面板打开后触发 |
| onInfoPanelClose | 信息面板关闭后触发 |

## ToolbarAction

移动端工具栏按钮类型。

```typescript
type ToolbarAction =
  | 'zoomIn'
  | 'zoomOut'
  | 'reset'
  | 'rotateLeft'
  | 'rotateRight'
  | 'thumbnails'
  | 'fullscreen'
  | 'download'
  | 'info'
```

## LoadingContext

自定义 loading 的上下文对象。

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

## LoadingNodeResult

自定义 loading 工厂函数可以返回 `LoadingNodeResult`，用于接管 loading 的关闭时机。

```typescript
interface LoadingNodeResult {
  node: HTMLElement
  done: (context: LoadingContext) => void | Promise<void>
}
```

### LoadingNodeResult 示例

```typescript
const loadingNode = (item: ViewerItem) => {
  const node = document.createElement('div')
  node.textContent = `加载 ${item.title || '图片'}...`

  return {
    node,
    done: (context: LoadingContext) => {
      context.onImageLoaded(() => context.closeLoading())
      context.onImageError(() => context.closeLoading())
    }
  }
}
```

## TransformChangeState

变换状态对象。

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

| 字段 | 说明 |
| --- | --- |
| scale | 当前缩放比例 |
| translateX | X 轴位移量，单位为像素 |
| translateY | Y 轴位移量，单位为像素 |
| rotation | 累积旋转角度，单位为度 |
| index | 当前预览项索引 |
| image | 当前预览项对象，没有图片时为 `null` |

## ZoomConfig

缩放配置。

```typescript
interface ZoomConfig {
  min?: number
  max?: number
  step?: number
  wheelBaseStep?: number
  wheelMaxStep?: number
  wheelSpeedMultiplier?: number
}
```

| 字段 | 说明 |
| --- | --- |
| min | 最小缩放比例 |
| max | 最大缩放比例 |
| step | 按钮缩放步长 |
| wheelBaseStep | 滚轮基础步长 |
| wheelMaxStep | 滚轮最大步长 |
| wheelSpeedMultiplier | 滚轮速度对步长的影响系数 |

滚轮缩放会根据滚动速度动态计算步长：

```text
step = wheelBaseStep + min(speed * wheelSpeedMultiplier, wheelMaxStep - wheelBaseStep)
```

## SwipeConfig

移动端滑动切换配置。

```typescript
interface SwipeConfig {
  maxDistance?: number
  viewportRatio?: number
  axisLockRatio?: number
}
```

| 字段 | 说明 |
| --- | --- |
| maxDistance | 触发切换的最大滑动距离限制 |
| viewportRatio | 触发切换所需距离相对于视口宽度的比例 |
| axisLockRatio | 横向/纵向手势锁定比例 |
