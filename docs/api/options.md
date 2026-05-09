# 配置实验台

这个页面提供一个可以在线修改 `ViewerProOptions` 的实验台。通过可视化控件调整配置项，预览器会实时重建，无需手动输入 JSON。

<script setup>
import { defineClientComponent } from 'vitepress'

const OptionsDemo = defineClientComponent(() => {
  return import('../.vitepress/components/OptionsDemo.vue')
})
</script>

<ClientOnly>
  <OptionsDemo />
</ClientOnly>

## 支持在线调整的属性

为了保持页面聚焦，实验台只内置最常用、最容易通过视觉或交互感知的配置：

| 属性 | Demo 中的表现 |
| --- | --- |
| `theme` | 切换 `dark`、`light`、`auto` 后，再打开预览观察主题变化。 |
| `mobileToolbar` | 勾选 `info` / `download` 后，移动端工具栏按钮组合会重建。 |
| `mobileSwipeToNavigate` | 控制移动端左右滑动切换能力。 |
| `keyboardShortcuts` | 控制键盘快捷键是否启用。 |
| `preloadAdjacent` | 控制是否预加载当前预览项相邻原图；缩略图懒加载不依赖这个开关。 |
| `infoRender` | 点击“打开信息面板”后，面板展示自定义信息内容。 |
| `onOpen` | 打开预览时写入事件日志。 |
| `onClose` | 关闭预览时写入事件日志。 |
| `onIndexChange` | 切换图片时写入事件日志。 |
| `onInfoPanelOpen` | 打开信息面板时写入事件日志。 |
| `onInfoPanelClose` | 关闭信息面板时写入事件日志。 |

更复杂的属性建议查看对应专题：

- `loadingNode`：[自定义 Loading](/guide/custom-loading)
- `renderNode`：[自定义渲染](/guide/custom-render)
- `zoomConfig`：[主题和配置](/guide/theme-and-config#缩放配置)

## 缩略图加载策略

缩略图导航已经针对大图集做了优化：

- 构造函数和 `addImages()` 只保存数据，不会立即请求预览器内部缩略图。
- 首次 `open(index)` 后才渲染缩略图导航。
- 缩略图图片先保存在 `data-src`，只有当前索引附近和滚动进入可视区域附近的缩略图才会设置真实 `src`。

## 相关页面

- [ViewerPro API](/api/viewer-pro)
- [类型定义](/api/types)
- [自定义 Loading](/guide/custom-loading)
- [自定义渲染](/guide/custom-render)
- [主题和配置](/guide/theme-and-config)
