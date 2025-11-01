<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, render } from 'vue'
import { ViewerPro, type ViewerItem, type LoadingContext } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://picsum.photos/800/600?random=50',
    thumbnail: 'https://picsum.photos/200/150?random=50',
    title: '组合示例 1',
    description: '同时使用多个自定义功能',
    width: 800,
    height: 600
  },
  {
    src: 'https://picsum.photos/800/600?random=51',
    thumbnail: 'https://picsum.photos/200/150?random=51',
    title: '组合示例 2',
    description: '自定义 Loading + 渲染 + 信息面板',
    width: 800,
    height: 600
  },
  {
    src: 'https://picsum.photos/800/600?random=52',
    thumbnail: 'https://picsum.photos/200/150?random=52',
    title: '组合示例 3',
    description: '完整的自定义体验',
    width: 800,
    height: 600
  }
]

const viewer = ref<ViewerPro | null>(null)
const currentTheme = ref<'dark' | 'light' | 'auto'>('dark')

onMounted(() => {
  // 1. 自定义 Loading
  const customLoading = (imgObj: ViewerItem, idx: number) => {
    const colors = ['#60A5FA', '#34D399', '#F59E0B']
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
      <span>${imgObj.title} 加载中...</span>
    `
    
    return wrap
  }

  // 2. 自定义渲染
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

  // 3. 自定义信息面板
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
          ${imgObj.title}
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
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">描述</span>
          <span style="font-weight: 500;">${imgObj.description || '无'}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">尺寸</span>
          <span style="font-weight: 500;">${imgObj.width} × ${imgObj.height}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">当前缩放</span>
          <span style="font-weight: 500;" id="info-scale-${idx}">100%</span>
        </div>
      </div>
    `
    
    return panel
  }

  viewer.value = new ViewerPro({
    images,
    theme: currentTheme.value,
    loadingNode: customLoading,
    renderNode: customRender,
    infoRender,
    onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
      // 同步变换到自定义渲染节点
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
      
      // 同步缩放信息到信息面板
      const scaleEl = document.getElementById(`info-scale-${index}`)
      if (scaleEl) {
        scaleEl.textContent = `${Math.round(scale * 100)}%`
      }
    }
  })
  viewer.value.init()
})

onUnmounted(() => {
  viewer.value?.destroy()
})

function openPreview(index: number) {
  viewer.value?.open(index)
}

function setTheme(theme: 'dark' | 'light' | 'auto') {
  currentTheme.value = theme
  if (viewer.value) {
    viewer.value.setTheme(theme)
  }
}
</script>

<template>
  <div class="demo-container">
    <p style="margin-bottom: 16px; color: var(--vp-c-text-2);">
      这个示例同时使用了自定义 Loading、自定义渲染、自定义信息面板和主题切换
    </p>
    
    <!-- 主题切换 -->
    <div class="theme-controls">
      <button 
        @click="setTheme('dark')"
        :class="['theme-btn', { active: currentTheme === 'dark' }]"
      >
        🌙 深色
      </button>
      <button 
        @click="setTheme('light')"
        :class="['theme-btn', { active: currentTheme === 'light' }]"
      >
        ☀️ 浅色
      </button>
      <button 
        @click="setTheme('auto')"
        :class="['theme-btn', { active: currentTheme === 'auto' }]"
      >
        🔄 自动
      </button>
    </div>
    
    <div class="demo-images">
      <div
        v-for="(img, idx) in images"
        :key="img.src"
        class="demo-image-item"
        @click="openPreview(idx)"
      >
        <img :src="img.thumbnail" :alt="img.title" />
        <div class="demo-image-title">{{ img.title }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 2px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.theme-btn.active {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  color: white;
}
</style>
