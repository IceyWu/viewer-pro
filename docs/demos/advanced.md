# 高级用法

本页面展示 ViewerPro 的高级使用场景，包括自定义 Loading、Live Photo 展示、自定义信息面板、主题切换等功能的完整示例。

<script setup>
import { defineClientComponent } from 'vitepress'

const ThemeDemo = defineClientComponent(() => {
  return import('../.vitepress/components/ThemeDemo.vue')
})

const AdvancedLoadingDemo = defineClientComponent(() => {
  return import('../.vitepress/components/AdvancedLoadingDemo.vue')
})

const CustomRenderDemo = defineClientComponent(() => {
  return import('../.vitepress/components/CustomRenderDemo.vue')
})

const CombinedDemo = defineClientComponent(() => {
  return import('../.vitepress/components/CombinedDemo.vue')
})

const LivePhotoDemo = defineClientComponent(() => {
  return import('../.vitepress/components/LivePhotoDemo.vue')
})
</script>

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

## 自定义 Loading 完整示例

### 在线演示

<ClientOnly>
  <AdvancedLoadingDemo />
</ClientOnly>

### 代码示例

展示如何创建高度自定义的 Loading，包括加载状态监听和进度显示：

```typescript
import { ViewerPro, type ViewerItem, type LoadingContext } from 'viewer-pro'

const advancedLoading = (imgObj: ViewerItem, idx: number) => {
  const colors = ['#60A5FA', '#34D399', '#F59E0B', '#EF4444', '#A78BFA']
  const color = colors[idx % colors.length]
  
  const wrap = document.createElement('div')
  wrap.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #fff;
  `
  
  wrap.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" stroke="${color}" 
              stroke-width="5" stroke-linecap="round" 
              stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
        <animateTransform attributeName="transform" type="rotate" 
                          from="0 25 25" to="360 25 25" dur="0.8s" 
                          repeatCount="indefinite"/>
      </circle>
    </svg>
    <span id="loading-text-${idx}">${imgObj.title || '图片'} 加载中...</span>
    <div style="font-size:12px;opacity:0.8;" id="loading-status-${idx}">
      准备加载图片...
    </div>
  `
  
  return {
    node: wrap,
    done: async (context: LoadingContext) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const statusEl = document.getElementById(`loading-status-${idx}`)
      
      // 模拟权限检查
      if (statusEl) statusEl.textContent = '检查访问权限...'
      await new Promise(resolve => setTimeout(resolve, 300))
      
      if (statusEl) statusEl.textContent = '权限验证通过，加载图片...'
      
      // 监听图片加载
      context.onImageLoaded(() => {
        if (statusEl) statusEl.textContent = '图片加载完成！'
        setTimeout(() => {
          context.closeLoading()
        }, 300)
      })
      
      context.onImageError((error) => {
        if (statusEl) statusEl.textContent = `加载失败: ${error}`
        setTimeout(() => context.closeLoading(), 2000)
      })
    }
  }
}

const viewer = new ViewerPro({
  images,
  loadingNode: advancedLoading
})

viewer.init()
```

**了解更多：** [自定义 Loading 文档](/guide/custom-loading)

## Live Photo 展示完整示例

### 在线演示

<ClientOnly>
  <LivePhotoDemo />
</ClientOnly>

### 安装依赖

**重要说明：** ViewerPro 本身不支持 Live Photo，需要配合第三方库 `live-photo` 来实现。

首先安装依赖：

```bash
npm install live-photo
# 或
pnpm add live-photo
```

### 代码示例

完整示例代码，包括自定义 Loading 和渲染：

```typescript
import { ViewerPro, type ViewerItem, type LoadingContext } from 'viewer-pro'
import { LivePhotoViewer } from 'live-photo'

const images: ViewerItem[] = [
  {
    src: 'https://example.com/photo1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: 'Live Photo 示例',
    type: 'live-photo',
    photoSrc: 'https://example.com/photo1.jpg',
    videoSrc: 'https://example.com/video1.mov'
  },
  {
    src: 'https://example.com/photo2.jpg',
    thumbnail: 'https://example.com/thumb2.jpg',
    title: '普通图片'
  }
]

// 自定义 Loading（区分 Live Photo 和普通图片）
const livePhotoLoading = (imgObj: ViewerItem, idx: number) => {
  const wrap = document.createElement('div')
  wrap.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #fff;
  `
  
  if (imgObj.type === 'live-photo') {
    wrap.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#60A5FA" 
                stroke-width="5" stroke-linecap="round" 
                stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
          <animateTransform attributeName="transform" type="rotate" 
                            from="0 25 25" to="360 25 25" dur="0.8s" 
                            repeatCount="indefinite"/>
        </circle>
      </svg>
      <span id="loading-text-${idx}">Live Photo 加载中...</span>
      <div style="font-size:12px;opacity:0.8;" id="loading-status-${idx}">
        准备加载图片和视频...
      </div>
    `
    
    return {
      node: wrap,
      done: async (context) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        
        const statusEl = document.getElementById(`loading-status-${idx}`)
        let imageLoaded = false
        let mediaReady = false
        
        context.onImageLoaded(() => {
          imageLoaded = true
          if (statusEl) statusEl.textContent = '图片加载完成，检查 Live Photo 媒体...'
          checkAllReady()
        })
        
        const checkMediaStatus = async () => {
          try {
            const mediaStatus = await context.getMediaLoadingStatus()
            const allImagesLoaded = mediaStatus.images.every(loaded => loaded)
            const allVideosLoaded = mediaStatus.videos.every(loaded => loaded)
            
            if (allImagesLoaded && allVideosLoaded) {
              mediaReady = true
              if (statusEl) statusEl.textContent = 'Live Photo 媒体加载完成！'
              checkAllReady()
            } else {
              if (statusEl) {
                statusEl.textContent = `媒体加载中... 图片:${mediaStatus.images.filter(Boolean).length}/${mediaStatus.images.length} 视频:${mediaStatus.videos.filter(Boolean).length}/${mediaStatus.videos.length}`
              }
              setTimeout(checkMediaStatus, 200)
            }
          } catch (e) {
            mediaReady = true
            checkAllReady()
          }
        }
        
        const checkAllReady = () => {
          if (imageLoaded && mediaReady) {
            if (statusEl) statusEl.textContent = '加载完成！'
            setTimeout(() => context.closeLoading(), 500)
          }
        }
        
        setTimeout(checkMediaStatus, 100)
      }
    }
  } else {
    wrap.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#60A5FA" 
                stroke-width="5" stroke-linecap="round" 
                stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
          <animateTransform attributeName="transform" type="rotate" 
                            from="0 25 25" to="360 25 25" dur="1s" 
                            repeatCount="indefinite"/>
        </circle>
      </svg>
      <span>${imgObj.title || '图片'} 加载中...</span>
    `
    return wrap
  }
}

// 自定义渲染（支持 Live Photo）
const customRender = (imgObj: ViewerItem, idx: number) => {
  const box = document.createElement('div')
  box.id = `custom-render-${idx}`
  box.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transform-origin: center center;
    will-change: transform;
  `
  
  if (imgObj.type === 'live-photo') {
    box.innerHTML = `<div id="live-photo-container-${idx}"></div>`
  } else {
    box.innerHTML = `
      <img src="${imgObj.src}" style="max-width: 90%; max-height: 90%;">
    `
  }
  
  return box
}

const viewer = new ViewerPro({
  images,
  loadingNode: livePhotoLoading,
  renderNode: customRender,
  onImageLoad: (imgObj, idx) => {
    // 仅对 Live Photo 类型初始化 LivePhotoViewer
    if (imgObj.type !== 'live-photo') {
      return
    }
    
    const container = document.getElementById(`live-photo-container-${idx}`)
    
    if (container) {
      // 创建 LivePhotoViewer 实例
      new LivePhotoViewer({
        photoSrc: imgObj.photoSrc || '',
        videoSrc: imgObj.videoSrc || '',
        container: container,
        width: 300,
        height: 300,
        // autoplay: false,  // 可选：是否自动播放
        imageCustomization: {
          styles: {
            objectFit: 'cover',
            borderRadius: '8px'
          },
          attributes: {
            alt: 'Live Photo Demo',
            loading: 'lazy'
          }
        }
      })
    }
  },
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    const el = document.getElementById(`custom-render-${index}`)
    if (el) {
      requestAnimationFrame(() => {
        el.style.transform = `
          translate(${translateX}px, ${translateY}px) 
          scale(${scale}) 
          rotate(${rotation}deg)
        `
      })
    }
  }
})

viewer.init()
```

**关键点：**

1. **依赖安装**：需要单独安装 `live-photo` 库
2. **类型标识**：通过 `type: 'live-photo'` 标识 Live Photo 类型
3. **数据结构**：Live Photo 需要 `photoSrc`（静态图片）和 `videoSrc`（视频）两个字段
4. **自定义渲染**：使用 `renderNode` 为 Live Photo 创建容器
5. **延迟初始化**：在 `onImageLoad` 回调中初始化 `LivePhotoViewer`
6. **加载控制**：可以使用自定义 Loading 监听媒体加载状态

**了解更多：** [自定义渲染文档](/guide/custom-render)

## 自定义信息面板完整示例

在 Vue 中使用组件渲染信息面板：

```vue
<script setup lang="ts">
import { ref, onMounted, h, render } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'
import ImageMetaPanel from './components/ImageMetaPanel.vue'

const images: ViewerItem[] = [
  {
    src: 'image1.jpg',
    thumbnail: 'thumb1.jpg',
    title: '美丽的风景',
    width: 1920,
    height: 1080,
    size: 2.5,
    date: '2024-01-15',
    location: '杭州西湖',
    metadata: {
      camera: 'Canon EOS R5',
      lens: 'RF 24-70mm F2.8',
      iso: 400,
      aperture: 'f/2.8',
      shutter: '1/200s'
    }
  }
]

const viewer = ref<ViewerPro | null>(null)
const renderedContainers = new Map<number, HTMLElement>()

const infoRender = (imgObj: ViewerItem, idx: number): HTMLElement => {
  // 清理之前的容器
  const oldContainer = renderedContainers.get(idx)
  if (oldContainer) {
    render(null, oldContainer)
  }
  
  // 创建新容器
  const container = document.createElement('div')
  container.id = `custom-info-${idx}`
  container.style.width = '100%'
  container.style.height = '100%'
  
  // 渲染 Vue 组件
  const vnode = h(ImageMetaPanel, { data: imgObj })
  render(vnode, container)
  
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

<template>
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
</template>
```

**了解更多：** [自定义信息面板文档](/guide/custom-info)

## 自定义渲染节点示例

### 在线演示

<ClientOnly>
  <CustomRenderDemo />
</ClientOnly>

### 代码示例

为图片添加自定义样式和效果。

## 主题切换完整示例

### 在线演示

<ClientOnly>
  <ThemeDemo />
</ClientOnly>

### 代码示例

实现主题切换功能，并保存用户偏好：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片1' },
  { src: 'image2.jpg', thumbnail: 'thumb2.jpg', title: '图片2' }
]

const viewer = ref<ViewerPro | null>(null)

// 从 localStorage 读取主题偏好
const savedTheme = localStorage.getItem('viewer-theme') as 'dark' | 'light' | 'auto' || 'dark'
const currentTheme = ref<'dark' | 'light' | 'auto'>(savedTheme)

onMounted(() => {
  viewer.value = new ViewerPro({
    images,
    theme: currentTheme.value,
    zoomConfig: {
      min: 0.5,
      max: 3,
      step: 0.2
    }
  })
  viewer.value.init()
})

const setTheme = (theme: 'dark' | 'light' | 'auto') => {
  currentTheme.value = theme
  if (viewer.value) {
    viewer.value.setTheme(theme)
  }
  // 保存到 localStorage
  localStorage.setItem('viewer-theme', theme)
}
</script>

<template>
  <div>
    <!-- 主题切换按钮 -->
    <div class="theme-controls">
      <button 
        @click="setTheme('dark')"
        :class="['theme-btn', { active: currentTheme === 'dark' }]"
      >
        <i class="fas fa-moon"></i> 深色主题
      </button>
      <button 
        @click="setTheme('light')"
        :class="['theme-btn', { active: currentTheme === 'light' }]"
      >
        <i class="fas fa-sun"></i> 浅色主题
      </button>
      <button 
        @click="setTheme('auto')"
        :class="['theme-btn', { active: currentTheme === 'auto' }]"
      >
        <i class="fas fa-circle-half-stroke"></i> 自动
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

.theme-btn {
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

.theme-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.theme-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #2563eb;
  color: white;
}
</style>
```

**了解更多：** [主题和配置文档](/guide/theme-and-config)

## 组合使用示例

### 在线演示

<ClientOnly>
  <CombinedDemo />
</ClientOnly>

### 代码示例

同时使用多个自定义功能：

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const viewer = new ViewerPro({
  images,
  
  // 自定义 Loading
  loadingNode: (imgObj, idx) => {
    const wrap = document.createElement('div')
    wrap.innerHTML = `<div class="custom-loading">加载 ${imgObj.title}...</div>`
    return wrap
  },
  
  // 自定义渲染
  renderNode: (imgObj, idx) => {
    const box = document.createElement('div')
    box.id = `custom-render-${idx}`
    box.innerHTML = `<img src="${imgObj.src}" style="border-radius: 12px;">`
    return box
  },
  
  // 自定义信息面板
  infoRender: (imgObj, idx) => {
    const panel = document.createElement('div')
    panel.innerHTML = `
      <h3>${imgObj.title}</h3>
      <p>索引: ${idx + 1}</p>
    `
    return panel
  },
  
  // 主题设置
  theme: 'dark',
  
  // 缩放配置
  zoomConfig: {
    min: 0.5,
    max: 5,
    step: 0.25
  },
  
  // 图片加载回调
  onImageLoad: (imgObj, idx) => {
    console.log('图片加载完成:', imgObj.title)
  },
  
  // 变换状态回调
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    const el = document.getElementById(`custom-render-${index}`)
    if (el) {
      el.style.transform = `
        translate(${translateX}px, ${translateY}px) 
        scale(${scale}) 
        rotate(${rotation}deg)
      `
    }
  }
})

viewer.init()
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
