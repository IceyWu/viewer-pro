# 主题和配置

ViewerPro 支持主题、缩放、移动端工具栏、键盘快捷键和手势等配置。

如果你想直接在线修改配置并查看效果，请使用 [配置实验台](/api/options)。

## 主题

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'auto'
})

viewer.setTheme('dark')
viewer.setTheme('light')
viewer.setTheme('auto')
```

可选值：

- `dark`
- `light`
- `auto`

## 缩放配置

```typescript
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    min: 0.5,
    max: 5,
    step: 0.3,
    wheelBaseStep: 0.15,
    wheelMaxStep: 0.3,
    wheelSpeedMultiplier: 0.01
  }
})
```

## 移动端工具栏

```typescript
const viewer = new ViewerPro({
  images,
  mobileToolbar: ['zoomIn', 'zoomOut', 'reset', 'thumbnails', 'info']
})
```

可用按钮：

- `zoomIn`
- `zoomOut`
- `reset`
- `rotateLeft`
- `rotateRight`
- `thumbnails`
- `fullscreen`
- `download`
- `info`

## 键盘快捷键

```typescript
const viewer = new ViewerPro({
  images,
  keyboardShortcuts: true
})
```

## 移动端滑动切换

```typescript
const viewer = new ViewerPro({
  images,
  mobileSwipeToNavigate: true,
  swipeConfig: {
    maxDistance: 120,
    viewportRatio: 0.25,
    axisLockRatio: 1.2
  }
})
```

## 预加载

```typescript
const viewer = new ViewerPro({
  images,
  preloadAdjacent: true,
  preloadCacheLimit: 10
})
```

`preloadAdjacent` 影响相邻原图预加载；缩略图导航本身会按需懒加载。

## 相关页面

- [配置实验台](/api/options)
- [类型定义](/api/types)
- [ViewerPro API](/api/viewer-pro)
