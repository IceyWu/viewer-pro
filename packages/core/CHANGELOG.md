# viewer-pro

## 0.2.0

### Features

- **itemSelector**: 新增 `itemSelector` 配置项，`init()` 绑定的选择器支持自定义，默认值改为 `.viewer-pro-item`
- **WebGL 渲染后端**: 新增 `backend` 配置项（`'auto'` | `'css'` | `'webgl'`），超大图自动走 GPU 渲染，支持 `webglFiltering` 纹理过滤设置
- **toolbar**: 新增 `toolbar` 配置项，桌面端侧边工具栏按钮组合可自定义
- **变换状态订阅**: 新增 `onTransform(listener)` 方法，返回取消订阅函数；新增 `onTransformChange` 配置回调
- **运行时缩放配置**: 新增 `setZoomConfig()` / `getZoomConfig()` 方法
- **状态读取**: 新增 `getState()` 方法，获取当前 scale / translate / rotation / index / image
- **自定义流程控制**: 新增 `notifyContentReady()` 和 `closeLoading()` 方法，用于自定义渲染和 loading 场景
- **滑动配置**: 新增 `swipeConfig` 配置项，移动端滑动切换阈值可调
- **预加载**: 新增 `preloadAdjacent` / `preloadCacheLimit` 配置项，相邻原图预加载策略可控

### Bug Fixes

- 修复切换图片时 WebGL canvas 未清空导致残留上一帧画面的问题
- 修复 `updatePreview()` 在自定义渲染模式下未正确清理旧节点的时序问题

### Breaking Changes

- `init()` 默认选择器从 `.image-grid-item` 改为 `.viewer-pro-item`，如需保持旧行为请传入 `itemSelector: '.image-grid-item'`

## 0.1.1

### Features

- **自定义 Loading**: `loadingNode` 支持固定节点、工厂函数、`LoadingNodeResult`（接管关闭时机）
- **自定义渲染**: `renderNode` 完全接管预览内容 DOM
- **自定义信息面板**: `infoRender` 渲染右侧信息面板
- **主题系统**: `theme` 配置 + `setTheme()` / `getTheme()` 运行时切换
- **缩略图导航**: 首次 `open()` 后按需渲染，可视区域懒加载
- **移动端工具栏**: `mobileToolbar` 配置按钮组合
- **移动端滑动切换**: `mobileSwipeToNavigate` 开关
- **键盘快捷键**: `keyboardShortcuts` 开关，支持 Esc / 方向键 / +- / f / d
- **事件回调**: `onOpen` / `onClose` / `onIndexChange` / `onImageLoad` / `onContentReady` / `onInfoPanelOpen` / `onInfoPanelClose`

## 0.0.2

### Bug Fixes

- 优化控件展示
