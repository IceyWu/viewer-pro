# 高级用法

本页面展示 ViewerPro 的高级使用场景。

## 动态添加图片

运行时动态添加或更新图片列表：

```typescript
const viewer = new ViewerPro({ images: [] })
viewer.init()

// 异步加载图片数据
async function loadImages() {
  const response = await fetch('/api/images')
  const data = await response.json()
  
  const images = data.map(item => ({
    src: item.url,
    thumbnail: item.thumbnail,
    title: item.title
  }))
  
  viewer.addImages(images)
}

loadImages()
```

## 状态管理

获取和管理 ViewerPro 的状态：

```typescript
const viewer = new ViewerPro({ images })

// 获取当前状态
const state = viewer.getState()
console.log('当前缩放:', state.scale)
console.log('当前位置:', state.translateX, state.translateY)
console.log('当前索引:', state.index)
console.log('当前图片:', state.image)

// 订阅状态变化
const unsubscribe = viewer.onTransform((state) => {
  // 将状态同步到外部状态管理
  store.commit('updateViewerState', state)
})
```

## 与 Vue 3 深度集成

在 Vue 3 中实现完整的状态同步：

```vue
<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [/* ... */]
const viewer = ref<ViewerPro | null>(null)

const state = reactive({
  scale: 1,
  translateX: 0,
  translateY: 0,
  currentIndex: 0,
  currentImage: null as ViewerItem | null
})

let unsubscribe: (() => void) | null = null

onMounted(() => {
  viewer.value = new ViewerPro({
    images,
    onTransformChange: (newState) => {
      Object.assign(state, newState)
    }
  })
  viewer.value.init()
  
  // 订阅状态变化
  unsubscribe = viewer.value.onTransform((newState) => {
    Object.assign(state, newState)
  })
})

onUnmounted(() => {
  unsubscribe?.()
  viewer.value?.destroy()
})
</script>

<template>
  <div>
    <div class="controls">
      <div>缩放: {{ Math.round(state.scale * 100) }}%</div>
      <div>位置: ({{ state.translateX }}, {{ state.translateY }})</div>
      <div>当前: {{ state.currentIndex + 1 }} / {{ images.length }}</div>
    </div>
    
    <div class="image-grid">
      <div
        v-for="(img, idx) in images"
        :key="img.src"
        @click="viewer?.open(idx)"
      >
        <img :src="img.thumbnail" :alt="img.title" />
      </div>
    </div>
  </div>
</template>
```

## Live Photo 支持

集成 Live Photo 功能：

```typescript
import { LivePhotoViewer } from 'live-photo'

const customRender = (imgObj: ViewerItem, idx: number) => {
  const box = document.createElement('div')
  box.id = `live-photo-container-${idx}`
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender,
  onImageLoad: (imgObj, idx) => {
    if (imgObj.type === 'live-photo') {
      const container = document.getElementById(`live-photo-container-${idx}`)
      
      new LivePhotoViewer({
        photoSrc: imgObj.photoSrc,
        videoSrc: imgObj.videoSrc,
        container: container,
        width: 300,
        height: 300
      })
    }
  }
})
```

## 自定义键盘快捷键

虽然 ViewerPro 内置了键盘快捷键，但你也可以添加自定义的：

```typescript
const viewer = new ViewerPro({ images })
viewer.init()

document.addEventListener('keydown', (e) => {
  const container = document.getElementById('imagePreview')
  if (!container?.classList.contains('active')) return
  
  switch (e.key) {
    case 'Home':
      viewer.open(0) // 跳转到第一张
      break
    case 'End':
      viewer.open(images.length - 1) // 跳转到最后一张
      break
    case 'PageUp':
      // 向前跳转 5 张
      const state = viewer.getState()
      viewer.open(Math.max(0, state.index - 5))
      break
    case 'PageDown':
      // 向后跳转 5 张
      const state = viewer.getState()
      viewer.open(Math.min(images.length - 1, state.index + 5))
      break
  }
})
```

## 性能优化

对于大量图片的场景，可以使用懒加载：

```typescript
// 初始只加载部分图片
const viewer = new ViewerPro({
  images: images.slice(0, 10)
})
viewer.init()

// 监听滚动，动态加载更多
let currentPage = 1
const pageSize = 10

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    const start = currentPage * pageSize
    const end = start + pageSize
    const moreImages = images.slice(start, end)
    
    if (moreImages.length > 0) {
      viewer.addImages([...viewer.getState().image ? images : [], ...moreImages])
      currentPage++
    }
  }
})
```

## 资源清理

在组件卸载时正确清理资源：

```typescript
// Vue 3
onUnmounted(() => {
  viewer.value?.destroy()
})

// React
useEffect(() => {
  const viewerInstance = new ViewerPro({ images })
  viewerInstance.init()
  
  return () => {
    viewerInstance.destroy()
  }
}, [])

// 原生 JavaScript
window.addEventListener('beforeunload', () => {
  viewer.destroy()
})
```

## 下一步

- [查看 API 文档](/api/)
- [查看基础用法](/demos/basic)
- [查看自定义示例](/demos/custom)
