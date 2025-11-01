<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ViewerPro, type ViewerItem, type LoadingContext } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://picsum.photos/800/600?random=30',
    thumbnail: 'https://picsum.photos/200/150?random=30',
    title: '高级 Loading 示例 1'
  },
  {
    src: 'https://picsum.photos/800/600?random=31',
    thumbnail: 'https://picsum.photos/200/150?random=31',
    title: '高级 Loading 示例 2'
  },
  {
    src: 'https://picsum.photos/800/600?random=32',
    thumbnail: 'https://picsum.photos/200/150?random=32',
    title: '高级 Loading 示例 3'
  }
]

const viewer = ref<ViewerPro | null>(null)

onMounted(() => {
  // 高级自定义 Loading
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
      <span id="loading-text-${idx}">${imgObj.title} 加载中...</span>
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
        
        context.onImageError((error: string) => {
          if (statusEl) statusEl.textContent = `加载失败: ${error}`
          setTimeout(() => context.closeLoading(), 2000)
        })
      }
    }
  }

  viewer.value = new ViewerPro({
    images,
    loadingNode: advancedLoading
  })
  viewer.value.init()
})

onUnmounted(() => {
  viewer.value?.destroy()
})

function openPreview(index: number) {
  viewer.value?.open(index)
}
</script>

<template>
  <div class="demo-container">
    <p style="margin-bottom: 16px; color: var(--vp-c-text-2);">
      这个示例展示了高级自定义 Loading，包括加载状态监听和进度显示
    </p>
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
