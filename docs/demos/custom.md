# 自定义

ViewerPro 提供了强大的自定义能力，让你可以根据需求定制各种功能。

## 在线演示

<script setup>
import { defineClientComponent } from 'vitepress'

const CustomDemo = defineClientComponent(() => {
  return import('../.vitepress/components/CustomDemo.vue')
})
</script>

<ClientOnly>
  <CustomDemo />
</ClientOnly>

## 自定义 Loading

自定义加载动画和提示：

```typescript
const customLoading = (item: ViewerItem, idx: number) => {
  const wrap = document.createElement('div')
  wrap.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #fff;
  `
  
  wrap.innerHTML = `
    <div class="spinner"></div>
    <span>加载 ${item.title}...</span>
    <div style="font-size: 12px; opacity: 0.8;">
      第 ${idx + 1} 张图片
    </div>
  `
  
  return wrap
}

const viewer = new ViewerPro({
  images,
  loadingNode: customLoading
})
```

## 高级 Loading 控制

使用 LoadingContext 实现高度自定义的加载控制：

```typescript
const advancedLoading = (item: ViewerItem, idx: number) => {
  const node = document.createElement('div')
  node.innerHTML = `
    <div class="loading-spinner"></div>
    <div id="loading-status">准备加载...</div>
  `
  
  return {
    node,
    done: async (context) => {
      const statusEl = document.getElementById('loading-status')
      
      // 监听图片加载
      context.onImageLoaded(() => {
        if (statusEl) statusEl.textContent = '加载完成！'
        setTimeout(() => context.closeLoading(), 500)
      })
      
      // 监听加载失败
      context.onImageError((error) => {
        if (statusEl) statusEl.textContent = `加载失败: ${error}`
        setTimeout(() => context.closeLoading(), 2000)
      })
      
      // 检查加载状态
      const status = await context.getImageLoadingStatus()
      if (status.loaded) {
        context.closeLoading()
      }
    }
  }
}

const viewer = new ViewerPro({
  images,
  loadingNode: advancedLoading
})
```

## 自定义渲染

自定义图片的渲染方式：

```typescript
const customRender = (imgObj: ViewerItem, idx: number) => {
  const box = document.createElement('div')
  box.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
  `
  
  box.innerHTML = `
    <img 
      src="${imgObj.src}" 
      style="
        max-width: 90%;
        max-height: 90%;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      "
    />
    <div style="
      margin-top: 20px;
      color: white;
      font-size: 18px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    ">
      ${imgObj.title}
    </div>
  `
  
  return box
}

const viewer = new ViewerPro({
  images,
  renderNode: customRender
})
```

## 自定义信息面板

自定义右侧信息面板的内容：

```typescript
const customInfo = (imgObj: ViewerItem, idx: number) => {
  const panel = document.createElement('div')
  panel.style.cssText = `
    padding: 20px;
    color: white;
  `
  
  panel.innerHTML = `
    <h3 style="margin-bottom: 16px;">${imgObj.title}</h3>
    <div style="margin-bottom: 12px;">
      <strong>索引:</strong> ${idx + 1}
    </div>
    <div style="margin-bottom: 12px;">
      <strong>地址:</strong> ${imgObj.src}
    </div>
    <div style="margin-bottom: 12px;">
      <strong>类型:</strong> ${imgObj.type || '图片'}
    </div>
  `
  
  return panel
}

const viewer = new ViewerPro({
  images,
  infoRender: customInfo
})
```

## 监听事件

监听各种事件并做出响应：

```typescript
const viewer = new ViewerPro({
  images,
  
  // 图片加载完成
  onImageLoad: (imgObj, idx) => {
    console.log('图片加载完成:', imgObj.title)
  },
  
  // 内容就绪
  onContentReady: (imgObj, idx) => {
    console.log('内容就绪:', imgObj.title)
  },
  
  // 变换状态改变
  onTransformChange: ({ scale, translateX, translateY, index, image }) => {
    console.log('缩放:', scale)
    console.log('位置:', translateX, translateY)
    console.log('当前索引:', index)
  }
})

// 也可以使用 onTransform 方法订阅
const unsubscribe = viewer.onTransform((state) => {
  console.log('状态变化:', state)
})

// 取消订阅
// unsubscribe()
```

## 组合使用

将多种自定义功能组合使用：

```typescript
const viewer = new ViewerPro({
  images,
  loadingNode: customLoading,
  renderNode: customRender,
  infoRender: customInfo,
  onImageLoad: (imgObj, idx) => {
    console.log('加载完成:', imgObj.title)
  },
  onTransformChange: (state) => {
    // 同步缩放信息到自定义渲染节点
    const el = document.getElementById(`custom-render-${state.index}`)
    if (el) {
      el.style.transform = `
        translate(${state.translateX}px, ${state.translateY}px) 
        scale(${state.scale})
      `
    }
  }
})
```

## 下一步

- [查看高级用法](/demos/advanced)
- [查看 API 文档](/api/)
