# 基础用法

本页面展示 ViewerPro 的基础使用方法。

## 简单示例

最基本的使用方式：

```typescript
import { ViewerPro, type ImageObj } from 'viewer-pro'

const images: ImageObj[] = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片 1'
  },
  {
    src: 'https://example.com/image2.jpg',
    thumbnail: 'https://example.com/thumb2.jpg',
    title: '图片 2'
  },
  {
    src: 'https://example.com/image3.jpg',
    thumbnail: 'https://example.com/thumb3.jpg',
    title: '图片 3'
  }
]

const viewer = new ViewerPro({ images })
viewer.init()
```

## 在 Vue 3 中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ViewerPro, type ImageObj } from 'viewer-pro'

const images: ImageObj[] = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片 1'
  }
]

const viewer = ref<ViewerPro | null>(null)

onMounted(() => {
  viewer.value = new ViewerPro({ images })
  viewer.value.init()
})

function openPreview(index: number) {
  viewer.value?.open(index)
}
</script>

<template>
  <div class="image-grid">
    <div
      v-for="(img, idx) in images"
      :key="img.src"
      class="image-grid-item"
      @click="openPreview(idx)"
    >
      <img :src="img.thumbnail" :alt="img.title" />
      <div class="title">{{ img.title }}</div>
    </div>
  </div>
</template>

<style scoped>
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.image-grid-item {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.image-grid-item:hover {
  transform: scale(1.05);
}

.image-grid-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.title {
  padding: 0.5rem;
  background: #f5f5f5;
  text-align: center;
}
</style>
```

## 在 React 中使用

```tsx
import { useEffect, useRef } from 'react'
import { ViewerPro, type ImageObj } from 'viewer-pro'

const images: ImageObj[] = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片 1'
  }
]

function App() {
  const viewerRef = useRef<ViewerPro | null>(null)

  useEffect(() => {
    viewerRef.current = new ViewerPro({ images })
    viewerRef.current.init()

    return () => {
      viewerRef.current?.destroy()
    }
  }, [])

  const openPreview = (index: number) => {
    viewerRef.current?.open(index)
  }

  return (
    <div className="image-grid">
      {images.map((img, idx) => (
        <div
          key={img.src}
          className="image-grid-item"
          onClick={() => openPreview(idx)}
        >
          <img src={img.thumbnail} alt={img.title} />
          <div className="title">{img.title}</div>
        </div>
      ))}
    </div>
  )
}
```

## 原生 JavaScript

```html
<!DOCTYPE html>
<html>
<body>
  <div class="image-grid">
    <div class="image-grid-item">
      <img src="thumb1.jpg" alt="图片1" />
    </div>
    <div class="image-grid-item">
      <img src="thumb2.jpg" alt="图片2" />
    </div>
  </div>

  <script src="node_modules/viewer-pro/dist/ViewerPro.js"></script>
  <script>
    const images = [
      { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片1' },
      { src: 'image2.jpg', thumbnail: 'thumb2.jpg', title: '图片2' }
    ]

    const viewer = new ViewerPro({ images })
    viewer.init()
  </script>
</body>
</html>
```

## 下一步

- [查看自定义示例](/demos/custom)
- [查看高级用法](/demos/advanced)
- [查看 API 文档](/api/)
