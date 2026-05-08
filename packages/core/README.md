# viewer-pro

现代化的图片预览组件，支持缩放、拖拽、旋转、全屏、缩略图导航、移动端手势、自定义渲染和信息面板等特性。

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
import { ViewerPro, type ViewerItem } from 'viewer-pro';

const images: ViewerItem[] = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片1'
  }
];

const viewer = new ViewerPro({ images });
viewer.open(0);
```

**注意：** CSS 已自动内联到 JS 中，无需单独引入样式文件。

## 特性

- 🖼️ 图片预览 - 支持图片缩放、拖拽、旋转、切换、全屏、下载
- 🎨 现代化 UI - 流畅的动画效果和现代感的 UI 设计
- 📱 响应式设计 - 完美适配桌面端和移动端
- 🎯 缩略图导航 - 打开预览后按需渲染，缩略图懒加载
- ⚙️ 高度可定制 - 支持自定义 Loading、预览内容渲染节点、信息面板
- 📸 Live Photo - 可通过 `renderNode` 集成第三方 Live Photo 组件
- ⚡ 大图集优化 - 不会在页面初始化或打开预览时一次性请求全部缩略图
- ⌨️ 键盘快捷键 - 支持键盘快捷键操作

## 常用 API

- `open(index)`：打开指定索引的预览项。
- `close()`：关闭预览。
- `addImages(images)`：替换预览项列表；只更新数据，不会立即触发缩略图请求。
- `showInfoPanel()` / `hideInfoPanel()` / `toggleInfo()`：控制信息面板。
- `showThumbnails()` / `hideThumbnails()` / `toggleThumbnailNav()`：控制缩略图导航。
- `onTransform(listener)`：订阅缩放、位移、旋转和索引状态变化。
- `destroy()`：销毁实例并释放事件监听、滚动锁定和渲染后端资源。

## 缩略图加载策略

`ViewerPro` 面向大量图片场景做了缩略图加载优化：

- 构造函数和 `addImages()` 只保存图片数据，不会立即创建缩略图请求。
- 首次调用 `open(index)` 后才渲染缩略图导航。
- 缩略图图片先写入 `data-src`，仅当前索引附近和滚动进入可视区域附近的缩略图才会设置真实 `src`。

## 文档

完整文档请访问：[ViewerPro 文档站点](https://viewer-pro.netlify.app/)

## License

MIT © [Icey Wu](https://github.com/iceywu)
