<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://picsum.photos/800/600?random=20',
    thumbnail: 'https://picsum.photos/200/150?random=20',
    title: '主题示例 1'
  },
  {
    src: 'https://picsum.photos/800/600?random=21',
    thumbnail: 'https://picsum.photos/200/150?random=21',
    title: '主题示例 2'
  },
  {
    src: 'https://picsum.photos/800/600?random=22',
    thumbnail: 'https://picsum.photos/200/150?random=22',
    title: '主题示例 3'
  },
  {
    src: 'https://picsum.photos/800/600?random=23',
    thumbnail: 'https://picsum.photos/200/150?random=23',
    title: '主题示例 4'
  }
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
      切换主题后点击图片查看效果
    </p>
    
    <!-- 主题切换按钮 -->
    <div class="theme-controls">
      <button 
        @click="setTheme('dark')"
        :class="['theme-btn', { active: currentTheme === 'dark' }]"
      >
        🌙 深色主题
      </button>
      <button 
        @click="setTheme('light')"
        :class="['theme-btn', { active: currentTheme === 'light' }]"
      >
        ☀️ 浅色主题
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
