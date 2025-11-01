# 自定义信息面板

ViewerPro 提供了自定义信息面板功能，让你可以在预览图片时展示丰富的元数据、EXIF 信息、或任何自定义内容。

## 功能概述

使用 `infoRender` 选项，你可以：

- 自定义信息面板的内容和样式
- 展示图片的元数据（EXIF、尺寸、文件大小等）
- 集成 Vue/React 组件
- 实现交互式的信息展示
- 为不同类型的图片展示不同的信息

## 基础用法

### infoRender 选项

`infoRender` 可以是一个固定的 HTML 元素，或者是一个根据图片内容动态生成元素的函数。

```typescript
interface ViewerProOptions {
  infoRender?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
}
```

### 固定节点

```typescript
const infoPanel = document.createElement('div')
infoPanel.innerHTML = `
  <h3>图片信息</h3>
  <p>这是一个固定的信息面板</p>
`

const viewer = new ViewerPro({
  images,
  infoRender: infoPanel
})
```

### 动态生成节点（推荐）

```typescript
const customInfo = (imgObj: ViewerItem, idx: number) => {
  const panel = document.createElement('div')
  panel.style.cssText = `
    padding: 20px;
    color: #333;
  `
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
      ${imgObj.title || '图片信息'}
    </h3>
    <div style="font-size: 14px; line-height: 1.8;">
      <p><strong>索引：</strong>${idx + 1}</p>
      <p><strong>地址：</strong>${imgObj.src}</p>
      ${imgObj.type ? `<p><strong>类型：</strong>${imgObj.type}</p>` : ''}
    </div>
  `
  
  return panel
}

const viewer = new ViewerPro({
  images,
  infoRender: customInfo
})
```

## 信息面板的显示和隐藏

信息面板以弹窗形式显示在预览器的右侧，用户可以通过以下方式控制：

- 点击侧边栏的"信息"按钮
- 按下 `Escape` 键关闭
- 点击面板的关闭按钮

## 实际示例

### 示例 1：HTML 字符串渲染

展示图片的基本信息：

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'image1.jpg',
    thumbnail: 'thumb1.jpg',
    title: '美丽的风景',
    width: 1920,
    height: 1080,
    size: 2.5, // MB
    date: '2024-01-15',
    location: '杭州西湖'
  }
]

const infoRender = (imgObj: ViewerItem, idx: number) => {
  const panel = document.createElement('div')
  panel.style.cssText = `
    padding: 24px;
    color: #1f2937;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `
  
  panel.innerHTML = `
    <div style="margin-bottom: 24px;">
      <h3 style="
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
        color: #111827;
      ">
        ${imgObj.title || '未命名'}
      </h3>
      <p style="
        margin: 0;
        font-size: 14px;
        color: #6b7280;
      ">
        第 ${idx + 1} 张，共 ${images.length} 张
      </p>
    </div>
    
    <div style="
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 14px;
    ">
      ${imgObj.width && imgObj.height ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">尺寸</span>
          <span style="font-weight: 500;">${imgObj.width} × ${imgObj.height}</span>
        </div>
      ` : ''}
      
      ${imgObj.size ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">大小</span>
          <span style="font-weight: 500;">${imgObj.size} MB</span>
        </div>
      ` : ''}
      
      ${imgObj.date ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">日期</span>
          <span style="font-weight: 500;">${imgObj.date}</span>
        </div>
      ` : ''}
      
      ${imgObj.location ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">位置</span>
          <span style="font-weight: 500;">${imgObj.location}</span>
        </div>
      ` : ''}
    </div>
    
    <div style="
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    ">
      <a href="${imgObj.src}" 
         target="_blank"
         style="
           display: inline-block;
           padding: 8px 16px;
           background: #3b82f6;
           color: white;
           text-decoration: none;
           border-radius: 6px;
           font-size: 14px;
           font-weight: 500;
         ">
        在新标签页打开
      </a>
    </div>
  `
  
  return panel
}

const viewer = new ViewerPro({
  images,
  infoRender
})

viewer.init()
```

### 示例 2：在 Vue 中使用组件

使用 Vue 的 `render` 函数将 Vue 组件渲染到信息面板：

```vue
<script setup lang="ts">
import { ref, onMounted, h, render } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'
import ImageMetaPanel from './components/ImageMetaPanel.vue'

const images: ViewerItem[] = [
  {
    src: 'image1.jpg',
    thumbnail: 'thumb1.jpg',
    title: '图片1',
    metadata: {
      camera: 'Canon EOS R5',
      lens: 'RF 24-70mm F2.8',
      iso: 400,
      aperture: 'f/2.8',
      shutter: '1/200s',
      focalLength: '50mm'
    }
  }
]

const viewer = ref<ViewerPro | null>(null)

// 存储已渲染的容器，用于清理
const renderedContainers = new Map<number, HTMLElement>()

const infoRender = (imgObj: ViewerItem, idx: number): HTMLElement => {
  // 清理之前的容器（如果存在）
  const oldContainer = renderedContainers.get(idx)
  if (oldContainer) {
    render(null, oldContainer) // 卸载 Vue 组件
  }
  
  // 创建新的容器元素
  const container = document.createElement('div')
  container.id = `custom-info-${idx}`
  container.style.width = '100%'
  container.style.height = '100%'
  
  // 使用 Vue 的 render 函数渲染组件
  const vnode = h(ImageMetaPanel, { data: imgObj })
  render(vnode, container)
  
  // 保存容器引用以便后续清理
  renderedContainers.set(idx, container)
  
  return container
}

onMounted(() => {
  viewer.value = new ViewerPro({
    images,
    infoRender
  })
  viewer.value.init()
})
</script>
```

**ImageMetaPanel.vue 组件示例：**

```vue
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: any
}

const props = defineProps<Props>()

const metadata = computed(() => props.data.metadata || {})
</script>

<template>
  <div class="image-meta-panel">
    <div class="panel-header">
      <h3>{{ data.title || '图片信息' }}</h3>
    </div>
    
    <div class="panel-content">
      <div class="meta-section" v-if="metadata.camera">
        <h4>相机信息</h4>
        <div class="meta-item">
          <span class="label">相机</span>
          <span class="value">{{ metadata.camera }}</span>
        </div>
        <div class="meta-item" v-if="metadata.lens">
          <span class="label">镜头</span>
          <span class="value">{{ metadata.lens }}</span>
        </div>
      </div>
      
      <div class="meta-section" v-if="metadata.iso">
        <h4>拍摄参数</h4>
        <div class="meta-item">
          <span class="label">ISO</span>
          <span class="value">{{ metadata.iso }}</span>
        </div>
        <div class="meta-item" v-if="metadata.aperture">
          <span class="label">光圈</span>
          <span class="value">{{ metadata.aperture }}</span>
        </div>
        <div class="meta-item" v-if="metadata.shutter">
          <span class="label">快门</span>
          <span class="value">{{ metadata.shutter }}</span>
        </div>
        <div class="meta-item" v-if="metadata.focalLength">
          <span class="label">焦距</span>
          <span class="value">{{ metadata.focalLength }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-meta-panel {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.panel-header h3 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.meta-section {
  margin-bottom: 24px;
}

.meta-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #f3f4f6;
}

.meta-item:last-child {
  border-bottom: none;
}

.meta-item .label {
  color: #6b7280;
}

.meta-item .value {
  font-weight: 500;
  color: #111827;
}
</style>
```

### 示例 3：动态数据展示

展示实时更新的缩放信息：

```typescript
const infoRender = (imgObj: ViewerItem, idx: number) => {
  const panel = document.createElement('div')
  panel.style.cssText = `
    padding: 24px;
    color: #1f2937;
  `
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
      ${imgObj.title || '图片信息'}
    </h3>
    
    <div style="
      padding: 16px;
      background: #f3f4f6;
      border-radius: 8px;
      margin-bottom: 16px;
    ">
      <div style="font-size: 14px; margin-bottom: 8px;">
        <strong>当前缩放：</strong>
        <span id="info-scale-${idx}">100%</span>
      </div>
      <div style="font-size: 14px;">
        <strong>位置：</strong>
        <span id="info-position-${idx}">0, 0</span>
      </div>
    </div>
    
    <div style="font-size: 14px; line-height: 1.8;">
      <p><strong>文件名：</strong>${imgObj.title}</p>
      <p><strong>地址：</strong>${imgObj.src}</p>
    </div>
  `
  
  return panel
}

const viewer = new ViewerPro({
  images,
  infoRender,
  onTransformChange: ({ scale, translateX, translateY, index }) => {
    // 更新信息面板中的缩放显示
    const scaleEl = document.getElementById(`info-scale-${index}`)
    if (scaleEl) {
      scaleEl.textContent = `${Math.round(scale * 100)}%`
    }
    
    // 更新位置显示
    const posEl = document.getElementById(`info-position-${index}`)
    if (posEl) {
      posEl.textContent = `${Math.round(translateX)}, ${Math.round(translateY)}`
    }
  }
})
```

### 示例 4：交互式信息面板

添加可交互的元素：

```typescript
const infoRender = (imgObj: ViewerItem, idx: number) => {
  const panel = document.createElement('div')
  panel.style.cssText = `
    padding: 24px;
    color: #1f2937;
  `
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
      ${imgObj.title || '图片信息'}
    </h3>
    
    <div style="margin-bottom: 16px;">
      <label style="
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
      ">
        图片标签
      </label>
      <div id="tags-${idx}" style="
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      ">
        ${(imgObj.tags || []).map(tag => `
          <span style="
            padding: 4px 12px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 16px;
            font-size: 12px;
          ">
            ${tag}
          </span>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <label style="
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
      ">
        评分
      </label>
      <div id="rating-${idx}" style="display: flex; gap: 4px;">
        ${[1, 2, 3, 4, 5].map(star => `
          <button 
            data-star="${star}"
            style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              padding: 0;
              color: ${star <= (imgObj.rating || 0) ? '#fbbf24' : '#d1d5db'};
            "
          >
            ★
          </button>
        `).join('')}
      </div>
    </div>
    
    <div>
      <label style="
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
      ">
        备注
      </label>
      <textarea 
        id="notes-${idx}"
        placeholder="添加备注..."
        style="
          width: 100%;
          min-height: 80px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        "
      >${imgObj.notes || ''}</textarea>
    </div>
  `
  
  // 添加事件监听
  setTimeout(() => {
    const ratingContainer = document.getElementById(`rating-${idx}`)
    if (ratingContainer) {
      ratingContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'BUTTON') {
          const star = parseInt(target.dataset.star || '0')
          imgObj.rating = star
          
          // 更新星星显示
          const buttons = ratingContainer.querySelectorAll('button')
          buttons.forEach((btn, i) => {
            (btn as HTMLElement).style.color = 
              i < star ? '#fbbf24' : '#d1d5db'
          })
        }
      })
    }
    
    const notesTextarea = document.getElementById(`notes-${idx}`) as HTMLTextAreaElement
    if (notesTextarea) {
      notesTextarea.addEventListener('input', (e) => {
        imgObj.notes = (e.target as HTMLTextAreaElement).value
      })
    }
  }, 0)
  
  return panel
}

const viewer = new ViewerPro({
  images: [
    {
      src: 'image1.jpg',
      thumbnail: 'thumb1.jpg',
      title: '图片1',
      tags: ['风景', '自然', '山水'],
      rating: 4,
      notes: '这是一张美丽的风景照片'
    }
  ],
  infoRender
})
```

## 样式定制

### 基础样式

```css
.custom-info-panel {
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1f2937;
}

.custom-info-panel h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.custom-info-panel p {
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.6;
}
```

### 响应式设计

```css
@media (max-width: 768px) {
  .custom-info-panel {
    padding: 16px;
  }
  
  .custom-info-panel h3 {
    font-size: 16px;
  }
}
```

### 滚动样式

```css
.custom-info-panel {
  max-height: 100%;
  overflow-y: auto;
}

/* 自定义滚动条 */
.custom-info-panel::-webkit-scrollbar {
  width: 8px;
}

.custom-info-panel::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.custom-info-panel::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.custom-info-panel::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
```

## 最佳实践

1. **保持简洁**：信息面板应该易于阅读，避免过多内容
2. **响应式设计**：确保在不同屏幕尺寸下都能正常显示
3. **性能优化**：避免在信息面板中执行耗时操作
4. **清理资源**：使用 Vue/React 组件时，确保正确清理
5. **可访问性**：使用语义化 HTML，提供适当的 ARIA 属性

## 注意事项

1. **容器尺寸**：信息面板会自动填充可用空间，无需手动设置宽高
2. **事件监听**：添加事件监听器时使用 `setTimeout` 确保 DOM 已添加
3. **Vue 组件清理**：切换图片时记得清理之前的 Vue 组件实例
4. **样式隔离**：使用 scoped 样式或 CSS Modules 避免样式冲突
5. **滚动处理**：内容较多时添加 `overflow-y: auto` 支持滚动

## 相关文档

- [自定义 Loading](/guide/custom-loading) - 了解如何自定义加载动画
- [自定义渲染节点](/guide/custom-render) - 了解如何自定义图片展示
- [API 参考 - ViewerProOptions](/api/types#viewerprooptions) - 完整的配置选项
- [高级示例](/demos/advanced) - 查看更多实际应用示例
