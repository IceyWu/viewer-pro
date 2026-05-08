# 自定义 Loading

ViewerPro 支持通过 `loadingNode` 自定义加载状态。你可以传入固定节点、节点工厂函数，或返回带 `done` 方法的对象来接管关闭时机。

## 固定节点

```typescript
const loading = document.createElement('div')
loading.textContent = '加载中...'

const viewer = new ViewerPro({
  images,
  loadingNode: loading
})
```

## 工厂函数

```typescript
const viewer = new ViewerPro({
  images,
  loadingNode: (item, index) => {
    const node = document.createElement('div')
    node.textContent = `正在加载 ${item.title || index + 1}`
    return node
  }
})
```

## 接管关闭时机

```typescript
const viewer = new ViewerPro({
  images,
  loadingNode: (item) => {
    const node = document.createElement('div')
    node.textContent = `加载 ${item.title || '图片'}...`

    return {
      node,
      done: (context) => {
        context.onImageLoaded(() => context.closeLoading())
        context.onImageError(() => context.closeLoading())
      }
    }
  }
})
```

## LoadingContext

`done(context)` 可以访问：

- `getImageLoadingStatus()`：获取当前图片加载状态。
- `getMediaLoadingStatus()`：获取自定义节点中媒体元素加载状态。
- `onImageLoaded(callback)`：监听图片加载完成。
- `onImageError(callback)`：监听图片加载失败。
- `getCurrentImage()`：获取当前预览项和索引。
- `closeLoading()`：关闭 loading。

## 相关页面

- [配置实验台](/api/options)
- [类型定义](/api/types#loadingcontext)
- [自定义渲染](/guide/custom-render)
