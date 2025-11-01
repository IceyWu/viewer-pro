<h1 align="center">🚀 ViewerPro</h1>
<p align="center">一个现代化、功能强大的图片预览组件，支持缩放、拖拽、全屏、缩略图导航、自定义渲染等特性。</p>

<p align="center">
  <a href="https://www.npmjs.com/package/viewer-pro"><img src="https://img.shields.io/npm/v/viewer-pro.svg" alt="npm version"></a>
  <a href="https://github.com/iceywu/viewer-pro/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/viewer-pro.svg" alt="license"></a>
</p>

---

## ✨ 特性

- 🖼️ **图片预览** - 支持图片缩放、拖拽、旋转、切换、全屏、下载
- 🎨 **现代化 UI** - 流畅的动画效果和现代感的 UI 设计
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🎯 **缩略图导航** - 快速定位和切换图片
- ⚙️ **高度可定制** - 支持自定义 Loading、渲染节点、信息面板
- 🎭 **主题系统** - 支持深色、浅色和自动主题切换
- 📸 **Live Photo** - 通过集成 `live-photo` 库支持动态照片展示
- ⌨️ **键盘快捷键** - 支持键盘快捷键操作

## 📦 安装

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

## 🚀 快速上手

### 在 Vue 3 中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ViewerPro, type ViewerItem } from "viewer-pro";

const images: ViewerItem[] = [
  {
    src: "https://example.com/1.jpg",
    thumbnail: "https://example.com/thumb1.jpg",
    title: "图片1",
  }
];

const viewer = ref<ViewerPro | null>(null);

onMounted(() => {
  viewer.value = new ViewerPro({ images });
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

### 在原生 HTML/JS 中使用

```html
<!DOCTYPE html>
<html>
<body>
  <div class="image-grid">
    <div class="image-grid-item">
      <img src="thumb1.jpg" alt="图片1" />
    </div>
  </div>

  <script src="node_modules/viewer-pro/dist/ViewerPro.js"></script>
  <script>
    const images = [
      { src: "image1.jpg", thumbnail: "thumb1.jpg", title: "图片1" }
    ];
    const viewer = new ViewerPro({ images });
    viewer.init();
  </script>
</body>
</html>
```

## ⚙️ API

### ViewerProOptions

| 参数           | 说明                         | 类型                                        |
| -------------- | ---------------------------- | ------------------------------------------- |
| images         | 图片数组                      | `ViewerItem[]`                                |
| loadingNode    | 自定义 loading 节点           | `HTMLElement` \| `() => HTMLElement` \| `(item, idx) => HTMLElement \| LoadingNodeResult`        |
| renderNode     | 自定义图片渲染节点            | `HTMLElement` \| `(item, idx) => HTMLElement` |
| infoRender     | 自定义信息面板                | `HTMLElement` \| `(item, idx) => HTMLElement` |
| theme          | 主题设置                      | `'dark'` \| `'light'` \| `'auto'`           |
| zoomConfig     | 缩放配置                      | `ZoomConfig`                                |
| onImageLoad    | 图片加载完成回调              | `(item, idx) => void`                       |
| onContentReady | 内容就绪回调                  | `(item, idx) => void`                       |
| onTransformChange | 变换状态改变回调           | `(state) => void`                           |

### ViewerItem

| 字段      | 说明         | 类型     |
| --------- | ------------ | -------- |
| src       | 图片地址     | string   |
| thumbnail | 缩略图地址   | string   |
| title     | 图片标题     | string   |
| type      | 图片类型     | string   |
| photoSrc  | Live Photo 图片地址 | string |
| videoSrc  | Live Photo 视频地址 | string |

### 常用方法

- `open(index: number)`：打开指定索引的图片预览
- `close()`：关闭预览
- `addImages(images: ViewerItem[])`：动态添加图片
- `init()`：初始化事件绑定
- `setTheme(theme)`：设置主题
- `setZoomConfig(config)`：设置缩放配置
- `getState()`：获取当前状态
- `destroy()`：销毁实例

## 📚 文档

完整文档请访问：[ViewerPro 文档站点](https://viewer-pro.netlify.app/)

## 🖼️ 示例

- [在线演示](https://viewer-pro.netlify.app/demos/basic)
- [Playground](./playground)

## 🏗️ 项目结构

本项目采用 pnpm monorepo 架构：

```
viewer-pro/
├── packages/
│   └── core/          # 核心包 (viewer-pro)
├── playground/        # Vue 3 演示应用
├── docs/             # VitePress 文档站点
└── pnpm-workspace.yaml
```

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 构建核心包
pnpm build

# 开发模式
pnpm dev:core        # 开发核心包
pnpm dev:playground  # 开发演示应用
pnpm dev:docs        # 开发文档站点

# 构建所有包
pnpm build:all
```

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md)。

## 📝 License

[MIT](LICENSE) © [Icey Wu](https://github.com/iceywu)