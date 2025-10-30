# viewer-pro

现代化的图片预览组件，支持缩放、拖拽、全屏、缩略图导航、自定义渲染等特性。

## 安装

```bash
npm install viewer-pro
# 或
pnpm add viewer-pro
# 或
yarn add viewer-pro
```

## 快速开始

```typescript
import { ViewerPro, type ImageObj } from 'viewer-pro';

const images: ImageObj[] = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片1'
  }
];

const viewer = new ViewerPro({ images });
viewer.init();
viewer.open(0);
```

**注意：** CSS 已自动内联到 JS 中，无需单独引入样式文件。

## 特性

- 🖼️ 图片预览 - 支持图片缩放、拖拽、切换、全屏、下载
- 🎨 现代化 UI - 流畅的动画效果和现代感的 UI 设计
- 📱 响应式设计 - 完美适配桌面端和移动端
- 🎯 缩略图导航 - 快速定位和切换图片
- ⚙️ 高度可定制 - 支持自定义 Loading 节点和图片渲染节点
- ⌨️ 键盘快捷键 - 支持键盘快捷键操作

## 文档

完整文档请访问：[ViewerPro 文档站点](https://iceywu.github.io/viewer-pro/)

## License

MIT © [Icey Wu](https://github.com/iceywu)
