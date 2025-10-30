<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://picsum.photos/800/600?random=10',
    thumbnail: 'https://picsum.photos/200/150?random=10',
    title: '自定义示例 1',
    description: '这是一张美丽的图片'
  },
  {
    src: 'https://picsum.photos/800/600?random=11',
    thumbnail: 'https://picsum.photos/200/150?random=11',
    title: '自定义示例 2',
    description: '支持自定义 Loading'
  },
  {
    src: 'https://picsum.photos/800/600?random=12',
    thumbnail: 'https://picsum.photos/200/150?random=12',
    title: '自定义示例 3',
    description: '支持自定义信息面板'
  }
]

const viewer = ref<ViewerPro | null>(null)

onMounted(() => {
  // 自定义 Loading
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
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #60a5fa;
        animation: spin 1s linear infinite;
      "></div>
      <span>加载 ${item.title}...</span>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `
    return wrap
  }

  // 自定义信息面板
  const customInfo = (item: ViewerItem, idx: number) => {
    const panel = document.createElement('div')
    panel.style.cssText = 'padding: 20px; color: white;'
    panel.innerHTML = `
      <h3 style="margin-bottom: 16px; font-size: 18px;">${item.title}</h3>
      <div style="margin-bottom: 12px;">
        <strong>索引:</strong> ${idx + 1} / ${images.length}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>描述:</strong> ${item.description || '无'}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>地址:</strong> <br/>
        <span style="font-size: 12px; word-break: break-all;">${item.src}</span>
      </div>
    `
    return panel
  }

  viewer.value = new ViewerPro({
    images,
    loadingNode: customLoading,
    infoRender: customInfo
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
      这个示例展示了自定义 Loading 和信息面板的效果
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
