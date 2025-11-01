# 类型定义

ViewerPro 的 TypeScript 类型定义。

## ViewerItem

预览项接口（支持图片、Live Photo、视频等多种媒体类型）。

```typescript
interface ViewerItem {
  src: string              // 图片完整地址
  thumbnail?: string       // 缩略图地址
  title?: string          // 图片标题
  type?: string           // 图片类型
  photoSrc?: string       // Live Photo 图片地址
  videoSrc?: string       // Live Photo 视频地址
  [key: string]: any      // 其他自定义属性
}
```

### 示例

```typescript
const image: ViewerItem = {
  src: 'https://example.com/image.jpg',
  thumbnail: 'https://example.com/thumb.jpg',
  title: '美丽的风景',
  type: 'photo'
}
```

## ViewerProOptions

ViewerPro 构造函数的配置选项。

```typescript
interface ViewerProOptions {
  images?: ViewerItem[]
  loadingNode?: HTMLElement | (() => HTMLElement) | ((item: ViewerItem, idx: number) => HTMLElement | LoadingNodeResult)
  renderNode?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
  infoRender?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
  onImageLoad?: (item: ViewerItem, idx: number) => void
  onContentReady?: (item: ViewerItem, idx: number) => void
  onTransformChange?: (state: TransformState) => void
  theme?: 'dark' | 'light' | 'auto'
  zoomConfig?: ZoomConfig
}
```

### 属性说明

#### images

预览项数组。

- **类型:** `ViewerItem[]`
- **可选:** 是
- **默认值:** `[]`

#### loadingNode

自定义 loading 节点。支持多种形式：

- **类型:** `HTMLElement | (() => HTMLElement) | ((imgObj, idx) => HTMLElement | LoadingNodeResult)`
- **可选:** 是

**示例:**

```typescript
// 固定节点
const loadingEl = document.createElement('div')
loadingEl.textContent = '加载中...'

// 工厂函数
const loadingFactory = () => {
  const el = document.createElement('div')
  el.className = 'custom-loading'
  return el
}

// 动态生成（带控制）
const loadingWithControl = (imgObj, idx) => {
  const node = document.createElement('div')
  node.textContent = `加载 ${imgObj.title}...`
  
  return {
    node,
    done: async (context) => {
      // 等待图片加载完成
      context.onImageLoaded(() => {
        context.closeLoading()
      })
    }
  }
}
```

#### renderNode

自定义图片渲染节点。

- **类型:** `HTMLElement | ((imgObj, idx) => HTMLElement)`
- **可选:** 是

#### infoRender

自定义信息面板渲染。

- **类型:** `HTMLElement | ((imgObj, idx) => HTMLElement)`
- **可选:** 是

#### onImageLoad

预览项加载完成回调。

- **类型:** `(item: ViewerItem, idx: number) => void`
- **可选:** 是

#### onContentReady

所有内容（包括自定义渲染内容）准备就绪后调用。

- **类型:** `(item: ViewerItem, idx: number) => void`
- **可选:** 是

#### onTransformChange

缩放/位移/索引变化时的回调。

- **类型:** `(state: TransformState) => void`
- **可选:** 是

#### theme

主题设置。

- **类型:** `'dark' | 'light' | 'auto'`
- **可选:** 是
- **默认值:** `'dark'`

**说明:**
- `dark` - 深色主题
- `light` - 浅色主题
- `auto` - 自动根据系统设置切换

#### zoomConfig

缩放配置选项。

- **类型:** `ZoomConfig`
- **可选:** 是

**示例:**

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'dark',
  zoomConfig: {
    min: 0.5,
    max: 3,
    step: 0.2
  }
})
```

## LoadingContext

加载上下文接口，用于高度自定义 loading 控制。

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

### 方法说明

#### getImageLoadingStatus()

获取当前图片的加载状态。

**返回值:** `Promise<{ loaded: boolean; error?: string }>`

#### getMediaLoadingStatus()

获取自定义渲染节点中的媒体元素加载状态。

**返回值:** `Promise<{ images: boolean[]; videos: boolean[]; audios: boolean[] }>`

#### onImageLoaded(callback)

监听图片加载完成事件。

**参数:**
- `callback: () => void` - 回调函数

#### onImageError(callback)

监听图片加载失败事件。

**参数:**
- `callback: (error: string) => void` - 回调函数

#### getCurrentImage()

获取当前预览项对象和索引。

**返回值:** `{ image: ViewerItem; index: number }`

#### closeLoading()

手动关闭 loading。

## TransformState

变换状态接口。

```typescript
interface TransformState {
  scale: number          // 缩放比例
  translateX: number     // X 轴位移
  translateY: number     // Y 轴位移
  rotation: number       // 旋转角度（度）
  index: number          // 当前预览项索引
  image: ViewerItem | null // 当前预览项对象
}
```

### 属性说明

#### scale

当前的缩放比例。

- **类型:** `number`
- **范围:** 由 `zoomConfig.min` 和 `zoomConfig.max` 决定，默认 0.5 - 3

#### translateX

X 轴的位移量（像素）。

- **类型:** `number`

#### translateY

Y 轴的位移量（像素）。

- **类型:** `number`

#### rotation

旋转角度（度）。

- **类型:** `number`
- **说明:** 累积旋转角度，可以是任意值（如 90, 180, 270, 360, 450 等）

#### index

当前预览项的索引。

- **类型:** `number`
- **范围:** 0 到 images.length - 1

#### image

当前预览项对象。

- **类型:** `ViewerItem | null`
- **说明:** 如果没有图片则为 null

## LoadingNodeResult

自定义 loading 节点的返回结果（高级用法）。

```typescript
interface LoadingNodeResult {
  node: HTMLElement
  done: (context: LoadingContext) => void | Promise<void>
}
```

### 示例

```typescript
const customLoading = (imgObj, idx) => {
  const node = document.createElement('div')
  node.textContent = '加载中...'
  
  return {
    node,
    done: async (context) => {
      // 监听图片加载
      context.onImageLoaded(() => {
        console.log('图片加载完成')
        context.closeLoading()
      })
      
      context.onImageError((error) => {
        console.error('加载失败:', error)
        context.closeLoading()
      })
    }
  }
}
```

## ZoomConfig

缩放配置接口。

```typescript
interface ZoomConfig {
  min?: number              // 最小缩放比例，默认 0.5
  max?: number              // 最大缩放比例，默认 3
  step?: number             // 按钮缩放步长，默认 0.2
  wheelBaseStep?: number    // 滚轮基础步长，默认 0.15
  wheelMaxStep?: number     // 滚轮最大步长，默认 0.3
  wheelSpeedMultiplier?: number  // 滚轮速度乘数，默认 0.01
}
```

### 属性说明

#### min

最小缩放比例。

- **类型:** `number`
- **默认值:** `0.5`
- **说明:** 图片可以缩小到原始尺寸的百分比

#### max

最大缩放比例。

- **类型:** `number`
- **默认值:** `3`
- **说明:** 图片可以放大到原始尺寸的倍数

#### step

按钮缩放步长。

- **类型:** `number`
- **默认值:** `0.2`
- **说明:** 点击放大/缩小按钮时的缩放增量

#### wheelBaseStep

滚轮基础步长。

- **类型:** `number`
- **默认值:** `0.15`
- **说明:** 慢速滚动时的缩放增量，提供精确控制

#### wheelMaxStep

滚轮最大步长。

- **类型:** `number`
- **默认值:** `0.3`
- **说明:** 快速滚动时的最大缩放增量

#### wheelSpeedMultiplier

滚轮速度乘数。

- **类型:** `number`
- **默认值:** `0.01`
- **说明:** 控制滚动速度对步长的影响程度

### 动态步长计算

ViewerPro 使用以下公式计算滚轮缩放步长：

```
步长 = wheelBaseStep + min(滚动速度 × wheelSpeedMultiplier, wheelMaxStep - wheelBaseStep)
```

这意味着：
- 慢速滚动使用基础步长，提供精确控制
- 快速滚动步长逐渐增加，提供快速缩放
- 步长不会超过最大步长，避免过度缩放

### 示例

```typescript
// 精确控制配置
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    min: 0.1,
    max: 10,
    step: 0.1,
    wheelBaseStep: 0.05,
    wheelMaxStep: 0.15,
    wheelSpeedMultiplier: 0.005
  }
})

// 快速浏览配置
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    min: 0.5,
    max: 3,
    step: 0.3,
    wheelBaseStep: 0.2,
    wheelMaxStep: 0.5,
    wheelSpeedMultiplier: 0.02
  }
})
```
