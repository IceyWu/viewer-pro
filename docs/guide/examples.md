# 使用示例

本页面展示了 ViewerPro 的各种使用场景。

## 基础示例

最简单的使用方式：

```typescript
import { ViewerPro } from 'viewer-pro'

const images = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片1'
  }
]

const viewer = new ViewerPro({ images })
viewer.init()
viewer.open(0) // 打开第一张图片
```

## 自定义 Loading

自定义加载动画：

```typescript
const customLoading = (imgObj, idx) => {
  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <div class="custom-loading">
      <div class="spinner"></div>
      <p>加载中... ${imgObj.title}</p>
    </div>
  `
  return wrap
}

const viewer = new ViewerPro({
  images,
  loadingNode: customLoading
})
```

## 自定义渲染

自定义图片渲染方式：

```typescript
const customRender = (imgObj, idx) => {
  const box = document.createElement('div')
  box.innerHTML = `
    <img src="${imgObj.src}" style="border-radius: 12px;">
    <div class="caption">${imgObj.title}</div>
  `
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender
})
```

## 监听事件

监听图片加载和变换事件：

```typescript
const viewer = new ViewerPro({
  images,
  onImageLoad: (imgObj, idx) => {
    console.log('图片加载完成:', imgObj.title)
  },
  onTransformChange: ({ scale, translateX, translateY, index }) => {
    console.log('缩放:', scale, '位置:', translateX, translateY)
  }
})
```

## 动态添加图片

运行时动态添加图片：

```typescript
const viewer = new ViewerPro({ images: [] })
viewer.init()

// 稍后添加图片
const newImages = [
  { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '新图片1' },
  { src: 'image2.jpg', thumbnail: 'thumb2.jpg', title: '新图片2' }
]

viewer.addImages(newImages)
```

## 更多示例

查看更多高级用法：

- [基础用法示例](/demos/basic)
- [自定义示例](/demos/custom)
- [高级用法示例](/demos/advanced)
