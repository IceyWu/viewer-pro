# 使用示例

本页面展示了 ViewerPro 的各种使用场景。

## 基础示例

最简单的使用方式：

```typescript
import { ViewerPro } from 'viewer-pro'

const images = [
  {
    src: 'https://example.com/image1.jpg',
    thumbnail: 'https://example.com/thumb1.jpg',
    title: '图片1'
  }
]

const viewer = new ViewerPro({ images })
viewer.init()
viewer.open(0) // 打开第一张图片
```

## 自定义 Loading

自定义加载动画：

```typescript
const customLoading = (imgObj, idx) => {
  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <div class="custom-loading">
      <div class="spinner"></div>
      <p>加载中... ${imgObj.title}</p>
    </div>
  `
  return wrap
}

const viewer = new ViewerPro({
  images,
  loadingNode: customLoading
})
```

## 自定义渲染

自定义图片渲染方式：

```typescript
const customRender = (imgObj, idx) => {
  const box = document.createElement('div')
  box.innerHTML = `
    <img src="${imgObj.src}" style="border-radius: 12px;">
    <div class="caption">${imgObj.title}</div>
  `
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender
})
```

## 监听事件

监听图片加载和变换事件：

```typescript
const viewer = new ViewerPro({
  images,
  onImageLoad: (imgObj, idx) => {
    console.log('图片加载完成:', imgObj.title)
  },
  onTransformChange: ({ scale, translateX, translateY, index }) => {
    console.log('缩放:', scale, '位置:', translateX, translateY)
  }
})
```

## 动态添加图片

运行时动态添加图片：

```typescript
const viewer = new ViewerPro({ images: [] })
viewer.init()

// 稍后添加图片
const newImages = [
  { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '新图片1' },
  { src: 'image2.jpg', thumbnail: 'thumb2.jpg', title: '新图片2' }
]

viewer.addImages(newImages)
```

## 自定义 Loading

自定义加载动画的简单示例：

```typescript
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
    <p style="margin: 0;">加载中...</p>
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
```

**了解更多：** [自定义 Loading 完整文档](/guide/custom-loading)

## 自定义渲染

自定义图片渲染方式的简单示例：

```typescript
const customRender = (imgObj, idx) => {
  const box = document.createElement('div')
  box.id = `custom-render-${idx}`
  box.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transform-origin: center center;
  `
  
  box.innerHTML = `
    <img src="${imgObj.src}" 
         style="
           max-width: 90%;
           max-height: 90%;
           border-radius: 12px;
           box-shadow: 0 10px 40px rgba(0,0,0,0.3);
         ">
  `
  
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender,
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
```

**了解更多：** [自定义渲染完整文档](/guide/custom-render)

## 自定义信息面板

自定义信息展示的简单示例：

```typescript
const customInfo = (imgObj, idx) => {
  const panel = document.createElement('div')
  panel.style.cssText = `
    padding: 24px;
    color: #1f2937;
  `
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
      ${imgObj.title || '图片信息'}
    </h3>
    <div style="font-size: 14px; line-height: 1.8;">
      <p><strong>索引：</strong>${idx + 1}</p>
      <p><strong>地址：</strong>${imgObj.src}</p>
      ${imgObj.width ? `<p><strong>尺寸：</strong>${imgObj.width} × ${imgObj.height}</p>` : ''}
    </div>
  `
  
  return panel
}

const viewer = new ViewerPro({
  images,
  infoRender: customInfo
})
```

**了解更多：** [自定义信息面板完整文档](/guide/custom-info)

## 主题和配置

主题切换和缩放配置示例：

```typescript
const viewer = new ViewerPro({
  images,
  theme: 'dark',  // 'dark' | 'light' | 'auto'
  zoomConfig: {
    min: 0.5,
    max: 3,
    step: 0.2,
    wheelBaseStep: 0.15,
    wheelMaxStep: 0.3
  }
})

// 动态切换主题
viewer.setTheme('light')

// 动态修改缩放配置
viewer.setZoomConfig({ max: 5 })
```

**了解更多：** [主题和配置完整文档](/guide/theme-and-config)

## 更多示例

查看更多高级用法：

- [基础用法示例](/demos/basic)
- [自定义示例](/demos/custom)
- [高级用法示例](/demos/advanced)
