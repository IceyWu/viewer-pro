# API 概览

ViewerPro 提供了简洁而强大的 API，让你可以轻松实现各种图片预览需求。

## 主要类

- [ViewerPro](/api/viewer-pro) - 核心类，提供图片预览功能

## 类型定义

- [ImageObj](/api/types#imageobj) - 图片对象接口
- [ViewerProOptions](/api/types#viewerprooptions) - 配置选项接口
- [LoadingContext](/api/types#loadingcontext) - 加载上下文接口

## 快速导航

### 构造函数

```typescript
new ViewerPro(options?: ViewerProOptions)
```

### 实例方法

- `init()` - 初始化事件绑定
- `open(index: number)` - 打开指定索引的图片
- `close()` - 关闭预览
- `addImages(images: ImageObj[])` - 添加图片
- `getState()` - 获取当前状态
- `destroy()` - 销毁实例

### 配置选项

- `images` - 图片数组
- `loadingNode` - 自定义 loading 节点
- `renderNode` - 自定义渲染节点
- `infoRender` - 自定义信息面板
- `onImageLoad` - 图片加载回调
- `onContentReady` - 内容就绪回调
- `onTransformChange` - 变换状态改变回调

## 下一步

- [ViewerPro 类详细文档](/api/viewer-pro)
- [类型定义详细文档](/api/types)
