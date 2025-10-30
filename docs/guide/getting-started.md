# 快速开始

本指南将帮助你快速上手 ViewerPro。

## 安装

首先，安装 ViewerPro：

::: code-group

```bash [npm]
npm install viewer-pro
```

```bash [pnpm]
pnpm add viewer-pro
```

```bash [yarn]
yarn add viewer-pro
```

:::

## 基础用法

### 在 Vue 3 中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片1'
  },
  {
    src: 'https://example.com/image2.jpg',
    thumbnail: 'https://example.com/thumb2.jpg',
    title: '图片2'
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
  <div>
    <div
      v-for="(img, idx) in images"
      :key="img.src"
      @click="openPreview(idx)"
    >
      <img :src="img.thumbnail" :alt="img.title" />
    </div>
  </div>
</template>
```

### 在原生 HTML/JS 中使用

```html
<!DOCTYPE html>
<html>
<body>
  <div class="image-grid" id="imageGallery">
    <div class="image-grid-item" data-src="https://example.com/1.jpg">
      <img src="https://example.com/thumb1.jpg" alt="图片1" />
    </div>
    <div class="image-grid-item" data-src="https://example.com/2.jpg">
      <img src="https://example.com/thumb2.jpg" alt="图片2" />
    </div>
  </div>

  <script src="node_modules/viewer-pro/dist/ViewerPro.js"></script>
  <script>
    const images = [
      {
        src: 'https://example.com/1.jpg',
        thumbnail: 'https://example.com/thumb1.jpg',
        title: '图片1'
      },
      {
        src: 'https://example.com/2.jpg',
        thumbnail: 'https://example.com/thumb2.jpg',
        title: '图片2'
      }
    ]

    const viewer = new ViewerPro({ images })
    viewer.init()
  </script>
</body>
</html>
```

## 配置选项

ViewerPro 支持多种配置选项：

```typescript
const viewer = new ViewerPro({
  images: [],                    // 图片数组
  loadingNode: customLoading,    // 自定义 loading 节点
  renderNode: customRender,      // 自定义图片渲染节点
  infoRender: customInfo,        // 自定义信息面板
  onImageLoad: (img, idx) => {}, // 图片加载完成回调
  onContentReady: (img, idx) => {}, // 内容就绪回调
  onTransformChange: (state) => {}  // 变换状态改变回调
})
```

## 下一步

- [查看更多示例](/guide/examples)
- [API 文档](/api/)
- [高级用法](/demos/advanced)
