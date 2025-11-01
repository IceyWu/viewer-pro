<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'

const images: ViewerItem[] = [
  {
    src: 'https://picsum.photos/800/600?random=40',
    thumbnail: 'https://picsum.photos/200/150?random=40',
    title: '自定义渲染 1'
  },
  {
    src: 'https://picsum.photos/800/600?random=41',
    thumbnail: 'https://picsum.photos/200/150?random=41',
    title: '自定义渲染 2'
  },
  {
    src: 'https://picsum.photos/800/600?random=42',
    thumbnail: 'https://picsum.photos/200/150?random=42',
    title: '自定义渲染 3'
  }
]

const viewer = ref<ViewerPro | null>(null)

onMounted(() => {
  // 自定义渲染节点
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

  viewer.value = new ViewerPro({
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
      这个示例展示了自定义渲染节点，为图片添加圆角、阴影和标题
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
