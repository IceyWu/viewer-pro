# 自定义渲染

通过 `renderNode` 可以完全接管预览内容的 DOM 渲染。它适合用于 Live Photo、BlurHash 占位、视频封面、图片对比等场景。

## 基础用法

```typescript
const viewer = new ViewerPro({
  images,
  renderNode: (item, index) => {
    const box = document.createElement('div')
    box.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;'

    const img = document.createElement('img')
    img.src = item.src
    img.alt = item.title || ''
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;'

    box.appendChild(img)
    return box
  }
})
```

## 同步变换状态

自定义节点需要自行处理缩放、位移和旋转效果。

```typescript
const viewer = new ViewerPro({
  images,
  renderNode: customRender,
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    const el = document.getElementById(`custom-render-${index}`)
    if (!el) return

    el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotation}deg)`
  }
})
```

## BlurHash 占位

`ViewerItem` 可以扩展 `blurhash`、`width`、`height` 等字段。你可以先渲染同尺寸比例的占位层，在图片加载完成后移除。

```typescript
const renderNode = (item: ViewerItem) => {
  const frame = document.createElement('div')
  frame.style.aspectRatio = `${item.width || 4} / ${item.height || 3}`

  const placeholder = document.createElement('canvas')
  const img = document.createElement('img')
  img.src = item.src
  img.onload = () => placeholder.remove()

  frame.append(placeholder, img)
  return frame
}
```

## Live Photo

ViewerPro 本身不内置 Live Photo 播放器，但可以通过 `renderNode` 创建容器，并在 `onImageLoad` 中初始化第三方组件。

```typescript
const viewer = new ViewerPro({
  images,
  renderNode: (item, index) => {
    const box = document.createElement('div')
    box.id = `live-photo-${index}`
    return box
  },
  onImageLoad: (item, index) => {
    if (item.type !== 'live-photo') return
    const container = document.getElementById(`live-photo-${index}`)
    if (!container) return
    // 在这里初始化 LivePhotoViewer
  }
})
```

## 相关页面

- [配置实验台](/api/options)
- [自定义 Loading](/guide/custom-loading)
- [类型定义](/api/types)
