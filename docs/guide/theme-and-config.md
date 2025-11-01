# 主题和配置

ViewerPro 提供了灵活的主题系统和缩放配置选项，让你可以根据项目需求定制预览器的外观和行为。

<script setup>
import { defineClientComponent } from 'vitepress'

const ThemeDemo = defineClientComponent(() => {
  return import('../.vitepress/components/ThemeDemo.vue')
})
</script>

## 在线演示

<ClientOnly>
  <ThemeDemo />
</ClientOnly>

## 主题系统

ViewerPro 支持三种主题模式：深色（dark）、浅色（light）和自动（auto）。

### 主题模式

#### dark - 深色主题

深色主题适合在暗光环境下使用，提供更舒适的视觉体验。

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'dark'
})
```

#### light - 浅色主题

浅色主题适合在明亮环境下使用，提供清晰的视觉效果。

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'light'
})
```

#### auto - 自动主题

自动主题会根据系统的主题设置自动切换深色或浅色模式。

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'auto'
})
```

### 动态切换主题

你可以在运行时动态切换主题：

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'dark'
})

viewer.init()

// 切换到浅色主题
viewer.setTheme('light')

// 切换到自动主题
viewer.setTheme('auto')

// 获取当前主题
const currentTheme = viewer.getTheme()
console.log('当前主题:', currentTheme)
```

### 主题切换示例

在 Vue 中实现主题切换：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片1' }
]

const viewer = ref<ViewerPro | null>(null)
const currentTheme = ref<'dark' | 'light' | 'auto'>('dark')

onMounted(() => {
  viewer.value = new ViewerPro({
    images,
    theme: currentTheme.value
  })
  viewer.value.init()
})

const setTheme = (theme: 'dark' | 'light' | 'auto') => {
  currentTheme.value = theme
  if (viewer.value) {
    viewer.value.setTheme(theme)
  }
}
</script>

<template>
  <div>
    <!-- 主题切换按钮 -->
    <div class="theme-controls">
      <button 
        @click="setTheme('dark')"
        :class="{ active: currentTheme === 'dark' }"
      >
        <i class="icon-moon"></i> 深色主题
      </button>
      <button 
        @click="setTheme('light')"
        :class="{ active: currentTheme === 'light' }"
      >
        <i class="icon-sun"></i> 浅色主题
      </button>
      <button 
        @click="setTheme('auto')"
        :class="{ active: currentTheme === 'auto' }"
      >
        <i class="icon-auto"></i> 自动
      </button>
    </div>
    
    <!-- 图片网格 -->
    <div class="image-grid">
      <div
        v-for="(img, idx) in images"
        :key="img.src"
        class="image-grid-item"
        @click="viewer?.open(idx)"
      >
        <img :src="img.thumbnail" :alt="img.title" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.theme-controls button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-controls button:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.theme-controls button.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #2563eb;
  color: white;
}
</style>
```

### 主题样式定制

ViewerPro 使用 CSS 变量来定义主题颜色，你可以通过覆盖这些变量来定制主题：

```css
/* 深色主题 */
[data-theme="dark"] {
  --vp-bg-color: #1f2937;
  --vp-text-color: #f9fafb;
  --vp-border-color: #374151;
  --vp-hover-color: #4b5563;
}

/* 浅色主题 */
[data-theme="light"] {
  --vp-bg-color: #ffffff;
  --vp-text-color: #1f2937;
  --vp-border-color: #e5e7eb;
  --vp-hover-color: #f3f4f6;
}
```

## 缩放配置

ViewerPro 提供了灵活的缩放配置选项，让你可以控制缩放的范围和速度。

### zoomConfig 选项

```typescript
interface ZoomConfig {
  min?: number              // 最小缩放比例，默认 0.5
  max?: number              // 最大缩放比例，默认 3
  step?: number             // 按钮缩放步长，默认 0.2
  wheelBaseStep?: number    // 滚轮基础步长，默认 0.15
  wheelMaxStep?: number     // 滚轮最大步长，默认 0.3
  wheelSpeedMultiplier?: number  // 滚轮速度乘数，默认 0.01
}
```

### 基础配置

```typescript
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    min: 0.5,    // 最小缩放到 50%
    max: 5,      // 最大缩放到 500%
    step: 0.25   // 每次点击按钮缩放 25%
  }
})
```

### 滚轮缩放配置

ViewerPro 使用动态步长算法来提供流畅的滚轮缩放体验：

```typescript
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    wheelBaseStep: 0.1,        // 基础步长：慢速滚动时的缩放量
    wheelMaxStep: 0.4,         // 最大步长：快速滚动时的缩放量
    wheelSpeedMultiplier: 0.015 // 速度乘数：控制速度对步长的影响
  }
})
```

#### 动态步长计算

滚轮缩放使用以下公式计算步长：

```
步长 = 基础步长 + min(滚动速度 × 速度乘数, 最大步长 - 基础步长)
```

这意味着：
- **慢速滚动**：使用基础步长，提供精确控制
- **快速滚动**：步长逐渐增加，提供快速缩放
- **最大限制**：步长不会超过最大步长，避免过度缩放

### 动态修改配置

你可以在运行时动态修改缩放配置：

```typescript
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    min: 0.5,
    max: 3
  }
})

viewer.init()

// 修改缩放配置
viewer.setZoomConfig({
  min: 0.3,
  max: 5,
  step: 0.3
})

// 获取当前配置
const config = viewer.getZoomConfig()
console.log('当前缩放配置:', config)
```

## 完整配置示例

### 示例 1：基础配置

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片1' },
  { src: 'image2.jpg', thumbnail: 'thumb2.jpg', title: '图片2' }
]

const viewer = new ViewerPro({
  images,
  theme: 'dark',
  zoomConfig: {
    min: 0.5,
    max: 3,
    step: 0.2,
    wheelBaseStep: 0.15,
    wheelMaxStep: 0.3,
    wheelSpeedMultiplier: 0.01
  }
})

viewer.init()
```

### 示例 2：精确控制

适合需要精确缩放控制的场景（如图片编辑、设计审查）：

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'light',
  zoomConfig: {
    min: 0.1,              // 允许缩小到 10%
    max: 10,               // 允许放大到 1000%
    step: 0.1,             // 每次缩放 10%，更精确
    wheelBaseStep: 0.05,   // 滚轮基础步长更小
    wheelMaxStep: 0.15,    // 滚轮最大步长更小
    wheelSpeedMultiplier: 0.005  // 速度影响更小
  }
})
```

### 示例 3：快速浏览

适合快速浏览大量图片的场景：

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'auto',
  zoomConfig: {
    min: 0.5,
    max: 3,
    step: 0.3,             // 每次缩放 30%，更快
    wheelBaseStep: 0.2,    // 滚轮基础步长更大
    wheelMaxStep: 0.5,     // 滚轮最大步长更大
    wheelSpeedMultiplier: 0.02  // 速度影响更大
  }
})
```

### 示例 4：响应式配置

根据设备类型使用不同的配置：

```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

const viewer = new ViewerPro({
  images,
  theme: 'auto',
  zoomConfig: isMobile ? {
    // 移动端配置
    min: 1,              // 移动端不允许缩小
    max: 3,
    step: 0.5,           // 更大的步长
    wheelBaseStep: 0.2,
    wheelMaxStep: 0.4,
    wheelSpeedMultiplier: 0.015
  } : {
    // 桌面端配置
    min: 0.5,
    max: 5,
    step: 0.2,
    wheelBaseStep: 0.15,
    wheelMaxStep: 0.3,
    wheelSpeedMultiplier: 0.01
  }
})
```

## 配置建议

### 主题选择

- **深色主题**：适合暗光环境、夜间使用、摄影作品展示
- **浅色主题**：适合明亮环境、办公场景、文档图片
- **自动主题**：适合需要适应用户系统设置的应用

### 缩放范围

- **min: 0.5, max: 3**：适合大多数场景
- **min: 0.1, max: 10**：适合需要极端缩放的场景（如设计审查）
- **min: 1, max: 3**：适合移动端，避免缩小导致的操作困难

### 缩放步长

- **step: 0.1-0.2**：适合需要精确控制的场景
- **step: 0.2-0.3**：适合一般浏览场景
- **step: 0.3-0.5**：适合快速浏览场景

### 滚轮缩放

- **慢速精确**：`wheelBaseStep: 0.05, wheelMaxStep: 0.15`
- **平衡体验**：`wheelBaseStep: 0.15, wheelMaxStep: 0.3`（默认）
- **快速缩放**：`wheelBaseStep: 0.2, wheelMaxStep: 0.5`

## 性能优化

### 1. 使用 auto 主题

`auto` 主题会自动适应系统设置，无需手动切换：

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'auto'  // 推荐使用
})
```

### 2. 合理设置缩放范围

避免过大的缩放范围，可以提升性能：

```typescript
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    min: 0.5,   // 不要设置过小
    max: 3      // 不要设置过大
  }
})
```

### 3. 调整滚轮速度

根据实际需求调整滚轮速度，避免过快或过慢：

```typescript
const viewer = new ViewerPro({
  images,
  zoomConfig: {
    wheelSpeedMultiplier: 0.01  // 适中的速度
  }
})
```

## 最佳实践

1. **提供主题切换**：让用户可以根据喜好选择主题
2. **使用默认配置**：大多数情况下默认配置已经足够好
3. **测试不同设备**：在不同设备上测试缩放体验
4. **考虑用户习惯**：根据目标用户的使用习惯调整配置
5. **保存用户偏好**：将用户的主题选择保存到 localStorage

## 保存用户偏好示例

```typescript
// 从 localStorage 读取主题偏好
const savedTheme = localStorage.getItem('viewer-theme') as 'dark' | 'light' | 'auto' || 'dark'

const viewer = new ViewerPro({
  images,
  theme: savedTheme
})

viewer.init()

// 切换主题时保存偏好
function setTheme(theme: 'dark' | 'light' | 'auto') {
  viewer.setTheme(theme)
  localStorage.setItem('viewer-theme', theme)
}
```

## 相关文档

- [自定义 Loading](/guide/custom-loading) - 了解如何自定义加载动画
- [自定义渲染节点](/guide/custom-render) - 了解如何自定义图片展示
- [自定义信息面板](/guide/custom-info) - 了解如何自定义信息展示
- [API 参考 - ViewerProOptions](/api/types#viewerprooptions) - 完整的配置选项
- [高级示例](/demos/advanced) - 查看更多实际应用示例
