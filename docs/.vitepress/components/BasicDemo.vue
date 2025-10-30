<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://picsum.photos/800/600?random=1',
    thumbnail: 'https://picsum.photos/200/150?random=1',
    title: '美丽的风景 1'
  },
  {
    src: 'https://picsum.photos/800/600?random=2',
    thumbnail: 'https://picsum.photos/200/150?random=2',
    title: '美丽的风景 2'
  },
  {
    src: 'https://picsum.photos/800/600?random=3',
    thumbnail: 'https://picsum.photos/200/150?random=3',
    title: '美丽的风景 3'
  },
  {
    src: 'https://picsum.photos/800/600?random=4',
    thumbnail: 'https://picsum.photos/200/150?random=4',
    title: '美丽的风景 4'
  },
  {
    src: 'https://picsum.photos/800/600?random=5',
    thumbnail: 'https://picsum.photos/200/150?random=5',
    title: '美丽的风景 5'
  },
  {
    src: 'https://picsum.photos/800/600?random=6',
    thumbnail: 'https://picsum.photos/200/150?random=6',
    title: '美丽的风景 6'
  }
]

const viewer = ref<ViewerPro | null>(null)

onMounted(() => {
  viewer.value = new ViewerPro({ images })
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
      点击图片查看预览效果（支持缩放、拖拽、切换、全屏等功能）
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
