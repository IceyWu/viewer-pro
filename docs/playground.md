# 配置实验台

在线调整 `ViewerProOptions` 常用配置，预览器会自动重建。

<script setup>
import { defineClientComponent } from 'vitepress'

const OptionsDemo = defineClientComponent(() => {
  return import('./.vitepress/components/OptionsDemo.vue')
})
</script>

<ClientOnly>
  <OptionsDemo />
</ClientOnly>

## 覆盖范围

实验台内置：`theme`、`backend`、`webglFiltering`、`keyboardShortcuts`、`mobileSwipeToNavigate`、`preloadAdjacent`、`preloadCacheLimit`、`toolbar`、`mobileToolbar`、`infoRender`，以及全部 `on*` 事件回调。

其它属性（`loadingNode`、`renderNode`、`zoomConfig`、`swipeConfig`）参见 [文档](/docs)。
