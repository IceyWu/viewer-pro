# 自定义 Loading

ViewerPro 提供了强大的自定义 Loading 功能，让你可以完全控制图片加载时的展示效果和加载逻辑。

<script setup>
import { defineClientComponent } from 'vitepress'

const AdvancedLoadingDemo = defineClientComponent(() => {
  return import('../.vitepress/components/AdvancedLoadingDemo.vue')
})
</script>

## 在线演示

<ClientOnly>
  <AdvancedLoadingDemo />
</ClientOnly>

## 功能概述

自定义 Loading 功能允许你：

- 自定义加载动画的外观和样式
- 监听图片和媒体的加载状态
- 控制 Loading 的显示和隐藏时机
- 在加载过程中执行自定义逻辑（如权限检查、API 调用等）
- 为不同类型的图片（如 Live Photo）提供不同的加载提示

## 三种使用方式

### 1. 固定节点

最简单的方式，提供一个固定的 HTML 元素作为 Loading 节点。

```typescript
const loadingEl = document.createElement('div')
loadingEl.className = 'my-loading'
loadingEl.innerHTML = `
  <div class="spinner"></div>
  <p>加载中...</p>
`

const viewer = new ViewerPro({
  images,
  loadingNode: loadingEl
})
```

**适用场景：** 所有图片使用相同的 Loading 样式，不需要动态内容。

### 2. 无参工厂函数

每次显示 Loading 时调用函数创建新的节点。

```typescript
const loadingFactory = () => {
  const wrap = document.createElement('div')
  wrap.className = 'custom-loading'
  wrap.innerHTML = `
    <svg class="spinner" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" stroke="#3b82f6" 
              stroke-width="5" stroke-dasharray="31.4 31.4">
        <animateTransform attributeName="transform" type="rotate" 
                          from="0 25 25" to="360 25 25" dur="1s" 
                          repeatCount="indefinite"/>
      </circle>
    </svg>
    <p>正在加载图片...</p>
  `
  return wrap
}

const viewer = new ViewerPro({
  images,
  loadingNode: loadingFactory
})
```

**适用场景：** 需要每次创建新的 Loading 节点，但不需要根据图片内容定制。

### 3. 带参数工厂函数（高级控制）

根据当前图片和索引动态生成 Loading 节点，并可以通过 `LoadingContext` 完全控制加载流程。

```typescript
const customLoading = (imgObj: ViewerItem, idx: number) => {
  const wrap = document.createElement('div')
  wrap.style.display = 'flex'
  wrap.style.flexDirection = 'column'
  wrap.style.alignItems = 'center'
  wrap.style.gap = '10px'
  wrap.style.color = '#fff'
  
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
    <span id="loading-text-${idx}">${imgObj.title || '图片'} 加载中...</span>
    <div style="font-size:12px;opacity:0.8;" id="loading-status-${idx}">
      准备加载...
    </div>
  `
  
  return {
    node: wrap,
    done: async (context) => {
      // 等待 DOM 添加完成
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const statusEl = document.getElementById(`loading-status-${idx}`)
      
      // 可以在这里执行自定义异步操作
      if (statusEl) statusEl.textContent = '检查权限...'
      
      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 500))
        if (statusEl) statusEl.textContent = '等待图片加载...'
        
        // 监听图片加载完成
        context.onImageLoaded(() => {
          if (statusEl) statusEl.textContent = '加载完成！'
          setTimeout(() => {
            context.closeLoading()
          }, 300)
        })
        
        // 监听加载失败
        context.onImageError((error) => {
          if (statusEl) statusEl.textContent = `加载失败: ${error}`
          setTimeout(() => context.closeLoading(), 2000)
        })
      } catch (error) {
        if (statusEl) statusEl.textContent = 'API 调用失败，继续加载...'
        context.onImageLoaded(() => {
          context.closeLoading()
        })
      }
    }
  }
}

const viewer = new ViewerPro({
  images,
  loadingNode: customLoading
})
```

**适用场景：** 需要根据图片内容定制 Loading，需要执行异步操作，需要精确控制 Loading 的关闭时机。

## LoadingContext 接口

当使用带参数工厂函数并返回 `{ node, done }` 对象时，`done` 函数会接收一个 `LoadingContext` 对象，提供以下方法：

### getImageLoadingStatus()

获取当前图片的加载状态。

```typescript
const status = await context.getImageLoadingStatus()
// { loaded: boolean, error?: string }
```

### getMediaLoadingStatus()

获取自定义渲染节点中的媒体元素（图片、视频、音频）的加载状态。

```typescript
const mediaStatus = await context.getMediaLoadingStatus()
// {
//   images: boolean[],   // 每个图片的加载状态
//   videos: boolean[],   // 每个视频的加载状态
//   audios: boolean[]    // 每个音频的加载状态
// }
```

**使用场景：** 在自定义渲染节点中包含多个媒体元素时，可以监控所有媒体的加载状态。

### onImageLoaded(callback)

监听图片加载完成事件。

```typescript
context.onImageLoaded(() => {
  console.log('图片加载完成')
  context.closeLoading()
})
```

### onImageError(callback)

监听图片加载失败事件。

```typescript
context.onImageError((error) => {
  console.error('加载失败:', error)
  context.closeLoading()
})
```

### getCurrentImage()

获取当前预览的图片对象和索引。

```typescript
const { image, index } = context.getCurrentImage()
console.log(`正在加载第 ${index + 1} 张图片:`, image.title)
```

### closeLoading()

手动关闭 Loading。

```typescript
context.closeLoading()
```

**重要：** 当使用 `done` 回调时，ViewerPro 不会自动关闭 Loading，你必须在适当的时机调用 `closeLoading()`。

## 实际示例

### 示例 1：简单的自定义 Loading

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片1' },
  { src: 'image2.jpg', thumbnail: 'thumb2.jpg', title: '图片2' }
]

const customLoading = () => {
  const wrap = document.createElement('div')
  wrap.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: white;
  `
  
  wrap.innerHTML = `
    <div style="
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <p style="margin: 0; font-size: 14px;">加载中...</p>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `
  
  return wrap
}

const viewer = new ViewerPro({
  images,
  loadingNode: customLoading
})

viewer.init()
```

### 示例 2：监听加载状态的高级 Loading

```typescript
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
    done: async (context) => {
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
```

### 示例 3：Live Photo 加载控制

**重要说明：** ViewerPro 本身不支持 Live Photo，需要配合第三方库 `live-photo` 来实现。

对于 Live Photo（包含图片和视频的动态照片），你可能需要等待所有媒体加载完成。首先安装依赖：

```bash
npm install live-photo
```

然后实现自定义 Loading：

```typescript
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
        if (statusEl) statusEl.textContent = '检查图片加载状态...'
        
        let imageLoaded = false
        let mediaReady = false
        
        // 监听图片加载
        context.onImageLoaded(() => {
          imageLoaded = true
          if (statusEl) statusEl.textContent = '图片加载完成，检查 Live Photo 媒体...'
          checkAllReady()
        })
        
        context.onImageError((error) => {
          if (statusEl) statusEl.textContent = `加载失败: ${error}`
          setTimeout(() => context.closeLoading(), 2000)
        })
        
        // 检查媒体加载状态
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
                const imgCount = mediaStatus.images.filter(Boolean).length
                const vidCount = mediaStatus.videos.filter(Boolean).length
                statusEl.textContent = `媒体加载中... 图片:${imgCount}/${mediaStatus.images.length} 视频:${vidCount}/${mediaStatus.videos.length}`
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
            setTimeout(() => {
              context.closeLoading()
            }, 500)
          }
        }
        
        setTimeout(checkMediaStatus, 100)
      }
    }
  } else {
    // 普通图片的 Loading
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

const viewer = new ViewerPro({
  images,
  loadingNode: livePhotoLoading,
  // 还需要配合自定义渲染节点和 onImageLoad 回调
  renderNode: (imgObj, idx) => {
    const box = document.createElement('div')
    box.id = `custom-render-${idx}`
    if (imgObj.type === 'live-photo') {
      box.innerHTML = `<div id="live-photo-container-${idx}"></div>`
    } else {
      box.innerHTML = `<img src="${imgObj.src}" style="max-width:90%;max-height:90%;">`
    }
    return box
  },
  onImageLoad: (imgObj, idx) => {
    if (imgObj.type === 'live-photo') {
      const container = document.getElementById(`live-photo-container-${idx}`)
      if (container) {
        new LivePhotoViewer({
          photoSrc: imgObj.photoSrc || '',
          videoSrc: imgObj.videoSrc || '',
          container: container,
          width: 300,
          height: 300
        })
      }
    }
  }
})
```

**注意：** Live Photo 的完整实现需要：
1. 自定义 Loading（监听媒体加载状态）
2. 自定义渲染节点（创建 Live Photo 容器）
3. onImageLoad 回调（初始化 LivePhotoViewer）

**了解更多：** [Live Photo 完整示例](/demos/advanced#live-photo-展示完整示例)

## 样式建议

自定义 Loading 的样式完全由你控制，以下是一些建议：

### 居中对齐

```css
.custom-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
```

### 动画效果

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.spinner {
  animation: spin 1s linear infinite;
}

.loading-text {
  animation: pulse 1.5s ease-in-out infinite;
}
```

### 颜色主题

根据图片索引使用不同的颜色：

```typescript
const colors = ['#60A5FA', '#34D399', '#F59E0B', '#EF4444', '#A78BFA']
const color = colors[idx % colors.length]
```

## 最佳实践

1. **始终提供反馈**：让用户知道加载正在进行
2. **处理错误**：使用 `onImageError` 监听加载失败
3. **及时关闭**：在适当的时机调用 `closeLoading()`
4. **避免阻塞**：异步操作不应阻塞图片加载
5. **清理资源**：确保 DOM 元素正确清理

## 相关文档

- [自定义渲染节点](/guide/custom-render) - 了解如何自定义图片展示方式
- [API 参考 - LoadingContext](/api/types#loadingcontext) - 完整的 API 文档
- [高级示例](/demos/advanced) - 查看更多实际应用示例
