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
  translateY: number      // Y 轴位移
  index: number           // 当前预览项索引
  image: ViewerItem | null // 当前预览项对象
}
```

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
