# 自定义渲染节点

ViewerPro 的自定义渲染节点功能允许你完全控制图片的展示方式，实现各种特殊的视觉效果，如 Live Photo、360度全景图、图片对比等。

<script setup>
import { defineClientComponent } from 'vitepress'

const CustomRenderDemo = defineClientComponent(() => {
  return import('../.vitepress/components/CustomRenderDemo.vue')
})

const LivePhotoDemo = defineClientComponent(() => {
  return import('../.vitepress/components/LivePhotoDemo.vue')
})
</script>

## 在线演示

<ClientOnly>
  <CustomRenderDemo />
</ClientOnly>

## 功能概述

使用 `renderNode` 选项，你可以：

- 替换默认的 `<img>` 元素，使用自定义的 HTML 结构
- 集成第三方库（如 Live Photo 查看器、全景图查看器等）
- 实现复杂的交互效果
- 为不同类型的图片提供不同的渲染方式
- 完全控制图片的样式和布局

## 基础用法

### renderNode 选项

`renderNode` 可以是一个固定的 HTML 元素，或者是一个根据图片内容动态生成元素的函数。

```typescript
interface ViewerProOptions {
  renderNode?: HTMLElement | ((item: ViewerItem, idx: number) => HTMLElement)
}
```

### 固定节点

```typescript
const customNode = document.createElement('div')
customNode.innerHTML = '<img src="..." style="border-radius: 12px;">'

const viewer = new ViewerPro({
  images,
  renderNode: customNode
})
```

### 动态生成节点（推荐）

```typescript
const customRender = (imgObj: ViewerItem, idx: number) => {
  const box = document.createElement('div')
  box.id = `custom-render-${idx}`
  box.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  `
  
  box.innerHTML = `
    <img src="${imgObj.src}" 
         style="max-width: 90%; max-height: 90%; border-radius: 8px;">
  `
  
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender
})
```

## 与变换功能集成

当使用自定义渲染节点时，ViewerPro 的缩放、拖拽、旋转功能仍然可用，但需要你手动同步变换状态到自定义节点。

### 使用 onTransformChange 回调

```typescript
const viewer = new ViewerPro({
  images,
  renderNode: customRender,
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    // 获取自定义渲染节点
    const el = document.getElementById(`custom-render-${index}`)
    if (!el) return
    
    // 同步变换状态
    el.style.transform = `
      translate(${translateX}px, ${translateY}px) 
      scale(${scale}) 
      rotate(${rotation}deg)
    `
  }
})
```

### 使用 requestAnimationFrame 优化性能

对于频繁的变换更新（如拖拽），使用 `requestAnimationFrame` 可以提升性能：

```typescript
onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
  const el = document.getElementById(`custom-render-${index}`)
  if (!el) return
  
  requestAnimationFrame(() => {
    el.style.transform = `
      translate(${translateX}px, ${translateY}px) 
      scale(${scale}) 
      rotate(${rotation}deg)
    `
  })
}
```

### 设置 transform-origin

确保自定义节点的变换原点设置正确：

```typescript
const customRender = (imgObj: ViewerItem, idx: number) => {
  const box = document.createElement('div')
  box.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transform-origin: center center;
    will-change: transform;
  `
  // ...
  return box
}
```

## 实际示例

### 示例 1：基础自定义渲染

为图片添加圆角和阴影效果：

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片1' },
  { src: 'image2.jpg', thumbnail: 'thumb2.jpg', title: '图片2' }
]

const customRender = (imgObj: ViewerItem, idx: number) => {
  const box = document.createElement('div')
  box.id = `custom-render-${idx}`
  box.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transform-origin: center center;
    will-change: transform;
  `
  
  box.innerHTML = `
    <img src="${imgObj.src}" 
         style="
           max-width: 90%;
           max-height: 90%;
           border-radius: 12px;
           box-shadow: 0 10px 40px rgba(0,0,0,0.3);
         ">
    <div style="
      margin-top: 16px;
      color: white;
      font-size: 18px;
      font-weight: 500;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    ">
      ${imgObj.title}
    </div>
  `
  
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender,
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    const el = document.getElementById(`custom-render-${index}`)
    if (!el) return
    
    requestAnimationFrame(() => {
      el.style.transform = `
        translate(${translateX}px, ${translateY}px) 
        scale(${scale}) 
        rotate(${rotation}deg)
      `
    })
  }
})

viewer.init()
```

### 示例 2：Live Photo 渲染

#### 在线演示

<ClientOnly>
  <LivePhotoDemo />
</ClientOnly>

#### 安装依赖

**重要说明：** ViewerPro 本身不支持 Live Photo，需要配合第三方库 `live-photo` 来实现。

首先安装 `live-photo` 库：

```bash
npm install live-photo
# 或
pnpm add live-photo
```

#### 代码示例

使用自定义渲染节点集成 Live Photo 功能：

```typescript
import { ViewerPro, type ViewerItem } from 'viewer-pro'
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

// 自定义渲染节点：为 Live Photo 创建容器
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
    // 为 Live Photo 创建容器
    box.innerHTML = `<div id="live-photo-container-${idx}"></div>`
  } else {
    // 普通图片
    box.innerHTML = `
      <img src="${imgObj.src}" 
           style="max-width: 90%; max-height: 90%;">
    `
  }
  
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender,
  onImageLoad: (imgObj: ViewerItem, idx: number) => {
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
            alt: imgObj.title || 'Live Photo',
            loading: 'lazy'
          }
        }
      })
    }
  },
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    const el = document.getElementById(`custom-render-${index}`)
    if (!el) return
    
    requestAnimationFrame(() => {
      el.style.transform = `
        translate(${translateX}px, ${translateY}px) 
        scale(${scale}) 
        rotate(${rotation}deg)
      `
    })
  }
})

viewer.init()
```

**关键点：**

1. **安装依赖**：需要单独安装 `live-photo` 库
2. **自定义渲染**：使用 `renderNode` 为 Live Photo 创建容器
3. **延迟初始化**：在 `onImageLoad` 回调中初始化 `LivePhotoViewer`
4. **类型判断**：通过 `type` 字段区分 Live Photo 和普通图片
5. **数据结构**：Live Photo 需要 `photoSrc` 和 `videoSrc` 两个字段

### 示例 3：图片对比（Before/After）

创建一个可以左右滑动对比两张图片的效果：

```typescript
const customRender = (imgObj: ViewerItem, idx: number) => {
  const box = document.createElement('div')
  box.id = `custom-render-${idx}`
  box.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
    will-change: transform;
  `
  
  if (imgObj.beforeSrc && imgObj.afterSrc) {
    box.innerHTML = `
      <div style="position: relative; max-width: 90%; max-height: 90%;">
        <img src="${imgObj.afterSrc}" 
             style="display: block; width: 100%; height: auto;">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          overflow: hidden;
        ">
          <img src="${imgObj.beforeSrc}" 
               style="display: block; width: 200%; height: 100%; object-fit: cover;">
        </div>
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 100%;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        "></div>
      </div>
    `
  } else {
    box.innerHTML = `
      <img src="${imgObj.src}" 
           style="max-width: 90%; max-height: 90%;">
    `
  }
  
  return box
}

const viewer = new ViewerPro({
  images: [
    {
      src: 'after.jpg',
      thumbnail: 'thumb.jpg',
      title: '对比图',
      beforeSrc: 'before.jpg',
      afterSrc: 'after.jpg'
    }
  ],
  renderNode: customRender,
  onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
    const el = document.getElementById(`custom-render-${index}`)
    if (!el) return
    
    requestAnimationFrame(() => {
      el.style.transform = `
        translate(${translateX}px, ${translateY}px) 
        scale(${scale}) 
        rotate(${rotation}deg)
      `
    })
  }
})
```

## 高级技巧

### 1. 使用 CSS 变量

ViewerPro 会将变换状态同步到 CSS 变量，你可以在自定义节点中使用：

```css
.custom-render-node {
  transform: 
    translate(var(--vp-tx, 0), var(--vp-ty, 0))
    scale(var(--vp-scale, 1))
    rotate(var(--vp-rotation, 0deg));
}
```

### 2. 监听变换事件

除了 `onTransformChange` 回调，你还可以监听自定义事件：

```typescript
viewer.previewContainer.addEventListener('viewerpro:transform', (e) => {
  const { scale, translateX, translateY, rotation, index } = e.detail
  // 处理变换
})
```

### 3. 获取当前状态

随时获取当前的变换状态：

```typescript
const state = viewer.getState()
console.log('当前缩放:', state.scale)
console.log('当前位置:', state.translateX, state.translateY)
console.log('当前旋转:', state.rotation)
```

### 4. 订阅变换变化

使用便捷的订阅方法：

```typescript
const unsubscribe = viewer.onTransform((state) => {
  console.log('变换更新:', state)
})

// 取消订阅
unsubscribe()
```

## 性能优化

### 1. 使用 will-change

```css
.custom-render-node {
  will-change: transform;
}
```

### 2. 使用 requestAnimationFrame

```typescript
onTransformChange: (state) => {
  requestAnimationFrame(() => {
    // 更新 DOM
  })
}
```

### 3. 避免重复查询 DOM

```typescript
// 不好的做法
onTransformChange: ({ index }) => {
  const el = document.getElementById(`custom-render-${index}`) // 每次都查询
  // ...
}

// 好的做法
const elements = new Map()

onTransformChange: ({ index }) => {
  let el = elements.get(index)
  if (!el) {
    el = document.getElementById(`custom-render-${index}`)
    elements.set(index, el)
  }
  // ...
}
```

### 4. 使用 transform 而非 top/left

```typescript
// 好 - 使用 transform（GPU 加速）
el.style.transform = `translate(${x}px, ${y}px)`

// 不好 - 使用 top/left（触发重排）
el.style.left = `${x}px`
el.style.top = `${y}px`
```

## 注意事项

1. **自定义节点必须返回 HTMLElement**：确保 `renderNode` 函数返回有效的 DOM 元素
2. **设置正确的尺寸**：自定义节点应该设置 `width: 100%; height: 100%` 以填充容器
3. **transform-origin**：设置为 `center center` 以确保缩放和旋转效果正确
4. **同步变换状态**：使用 `onTransformChange` 回调同步变换到自定义节点
5. **清理资源**：如果使用了第三方库，确保在切换图片时正确清理

## 相关文档

- [自定义 Loading](/guide/custom-loading) - 了解如何自定义加载动画
- [自定义信息面板](/guide/custom-info) - 了解如何自定义信息展示
- [API 参考 - ViewerProOptions](/api/types#viewerprooptions) - 完整的配置选项
- [高级示例](/demos/advanced) - 查看更多实际应用示例
