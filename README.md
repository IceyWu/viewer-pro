<!-- <p align="center">
  <img src="https://picsum.photos/seed/viewerpro/120/120" alt="ViewerPro Logo" width="120" />
</p> -->
<h1 align="center">🚀ViewerPro</h1>
<p align="center">一个现代化、功能强大的图片预览组件，支持缩放、拖拽、全屏、缩略图导航、自定义渲染等特性。</p>

---

## ✨ 特性

- 支持图片缩放、拖拽、切换、全屏、下载
- 缩略图导航，快速定位图片
- 支持自定义 Loading 节点和图片渲染节点
- 键盘快捷键支持
- 响应式设计，移动端友好

## 📦 安装

```bash
npm install viewer-pro
# 或
yarn add viewer-pro
```

## 🚀 快速上手

### 1. 在 Vue3 项目中使用

```vue
// filepath: playground/src/App.vue
<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { ViewerPro } from "viewer-pro";
import "viewer-pro/dist/ViewerPro.css";

const images = [
  {
    src: "https://example.com/1.jpg",
    thumbnail: "https://example.com/thumb1.jpg",
    title: "图片1",
  },
  // ...更多图片
];

const viewer = ref<any>(null);

onMounted(async () => {
  await nextTick();
  viewer.value = new ViewerPro({
    images,
    // 可选：自定义 loading 节点和渲染节点
    // loadingNode: ...,
    // renderNode: ...,
  });
  viewer.value.init();
});

function openPreview(idx: number) {
  viewer.value?.open(idx);
}
</script>

<template>
  <div>
    <div v-for="(img, idx) in images" :key="img.src" @click="openPreview(idx)">
      <img :src="img.thumbnail" :alt="img.title" />
    </div>
  </div>
</template>
```

### 2. 原生 HTML/JS 使用

```html
<!-- filepath: demo/html-demo.html -->
<link rel="stylesheet" href="src/core/ViewerPro.css" />
<script src="dist/ViewerPro.js"></script>
<div class="image-grid" id="imageGallery">
  <div class="image-grid-item" data-src="https://example.com/1.jpg" data-title="图片1">
    <img src="https://example.com/thumb1.jpg" alt="图片1" />
  </div>
  <!-- ...更多图片 -->
</div>
<script>
  const images = [
    { src: "https://example.com/1.jpg", thumbnail: "https://example.com/thumb1.jpg", title: "图片1" },
    // ...
  ];
  const viewer = new ViewerPro({ images });
  viewer.init();
</script>
```

## ⚙️ API

### ViewerProOptions

| 参数           | 说明                         | 类型                                        |
| -------------- | ---------------------------- | ------------------------------------------- |
| images         | 图片数组                      | `ImageObj[]`                                |
| loadingNode    | 自定义 loading 节点           | `HTMLElement` \| `() => HTMLElement`        |
| renderNode     | 自定义图片渲染节点            | `HTMLElement` \| `(imgObj, idx) => HTMLElement` |
| onImageLoad    | 图片加载完成回调              | `(imgObj, idx) => void`                     |

### ImageObj

| 字段      | 说明         | 类型     |
| --------- | ------------ | -------- |
| src       | 图片地址     | string   |
| thumbnail | 缩略图地址   | string   |
| title     | 图片标题     | string   |

### 常用方法

- `open(index: number)`：打开指定索引的图片预览
- `close()`：关闭预览
- `addImages(images: ImageObj[])`：动态添加图片
- `init()`：初始化事件绑定

## 🖼️ 示例

- [HTML DEMO](demo/html-demo.html)
- [Vue3 DEMO](playground/src/App.vue)

## 📝 License

MIT