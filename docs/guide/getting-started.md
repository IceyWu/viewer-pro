# 快速开始

## 安装

```bash
pnpm add viewer-pro
```

## 基础使用

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://example.com/image-1.jpg',
    thumbnail: 'https://example.com/thumb-1.jpg',
    title: '图片 1'
  },
  {
    src: 'https://example.com/image-2.jpg',
    thumbnail: 'https://example.com/thumb-2.jpg',
    title: '图片 2'
  }
]

const viewer = new ViewerPro({ images })

viewer.open(0)
```

## 在框架中使用

在 Vue、React 等框架里，推荐你自己渲染图片列表，并在点击时调用 `open(index)`。

```typescript
function openPreview(index: number) {
  viewer.open(index)
}
```

## 常用配置

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'auto',
  keyboardShortcuts: true,
  mobileToolbar: ['zoomIn', 'zoomOut', 'reset', 'thumbnails', 'info'],
  mobileSwipeToNavigate: true
})
```

## 在线调试配置

如果你想直接修改配置并查看效果，请使用 [配置实验台](/api/options)。

## 下一步

- [配置实验台](/api/options)
- [ViewerPro API](/api/viewer-pro)
- [类型定义](/api/types)
