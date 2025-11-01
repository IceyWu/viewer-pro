<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ViewerPro, type ViewerItem, type LoadingContext } from 'viewer-pro'

// 使用实际的 Live Photo 数据（来自 playground/src/App.vue）
const images: ViewerItem[] = [
  {
    src: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483139550.JPEG",
    thumbnail: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483139550.JPEG?x-oss-process=image/resize,l_800/format,jpg",
    photoSrc: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483139550.JPEG",
    videoSrc: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483140652.MOV",
    title: "Live Photo 示例",
    type: "live-photo",
  },
  {
    src: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483141159.JPEG",
    thumbnail: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483141159.JPEG?x-oss-process=image/resize,l_800/format,jpg",
    title: "普通图片 1",
  },
  {
    src: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483142243.JPEG",
    thumbnail: "https://lpalette.oss-accelerate.aliyuncs.com/nestTest/1/1761483142243.JPEG?x-oss-process=image/resize,l_800/format,jpg",
    title: "普通图片 2",
  }
]

const viewer = ref<ViewerPro | null>(null)
let LivePhotoViewer: any = null

onMounted(async () => {
  // 动态导入 live-photo（仅在客户端）
  try {
    const livePhotoModule = await import('live-photo')
    LivePhotoViewer = livePhotoModule.LivePhotoViewer
  } catch (e) {
    console.warn('Failed to load live-photo library:', e)
  }

  // 自定义 Loading（区分 Live Photo 和普通图片）
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
        done: async (context: LoadingContext) => {
          await new Promise(resolve => setTimeout(resolve, 10))
          
          const statusEl = document.getElementById(`loading-status-${idx}`)
          let imageLoaded = false
          let mediaReady = false
          
          context.onImageLoaded(() => {
            imageLoaded = true
            if (statusEl) statusEl.textContent = '图片加载完成，检查 Live Photo 媒体...'
            checkAllReady()
          })
          
          context.onImageError((error: string) => {
            if (statusEl) statusEl.textContent = `加载失败: ${error}`
            setTimeout(() => context.closeLoading(), 2000)
          })
          
          const checkMediaStatus = async () => {
            try {
              const mediaStatus = await context.getMediaLoadingStatus()
              const allImagesLoaded = mediaStatus.images.every((loaded: boolean) => loaded)
              const allVideosLoaded = mediaStatus.videos.every((loaded: boolean) => loaded)
              
              if (allImagesLoaded && allVideosLoaded) {
                mediaReady = true
                if (statusEl) statusEl.textContent = 'Live Photo 媒体加载完成！'
                checkAllReady()
              } else {
                if (statusEl) {
                  statusEl.textContent = `媒体加载中... 图片:${mediaStatus.images.filter(Boolean).length}/${mediaStatus.images.length} 视频:${mediaStatus.videos.filter(Boolean).length}/${mediaStatus.videos.length}`
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
              setTimeout(() => context.closeLoading(), 500)
            }
          }
          
          setTimeout(checkMediaStatus, 100)
        }
      }
    } else {
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

  // 自定义渲染节点（支持 Live Photo）
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
      box.innerHTML = `<div id="live-photo-container-${idx}"></div>`
    } else {
      box.innerHTML = `
        <img src="${imgObj.src}" style="max-width: 90%; max-height: 90%;">
      `
    }
    
    return box
  }

  viewer.value = new ViewerPro({
    images,
    loadingNode: livePhotoLoading,
    renderNode: customRender,
    onImageLoad: (imgObj: ViewerItem, idx: number) => {
      // 仅对 Live Photo 类型初始化 LivePhotoViewer
      if (imgObj.type !== 'live-photo' || !LivePhotoViewer) {
        return
      }
      
      const container = document.getElementById(`live-photo-container-${idx}`)
      
      if (container) {
        // 创建 LivePhotoViewer 实例
        new LivePhotoViewer({
          photoSrc: imgObj.photoSrc || '',
          videoSrc: imgObj.videoSrc || '',
          container: container,
          height: 600,
          imageCustomization: {
            styles: {
              objectFit: 'cover',
              borderRadius: '8px'
            },
            attributes: {
              alt: 'Live Photo Demo',
              loading: 'lazy'
            }
          }
        })
      }
    },
    onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
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
    <div style="margin-bottom: 16px; padding: 12px; background: var(--vp-c-bg-soft); border-radius: 8px; border-left: 4px solid var(--vp-c-brand);">
      <p style="margin: 0 0 8px 0; color: var(--vp-c-text-1); font-weight: 500;">
        💡 重要说明
      </p>
      <p style="margin: 0; color: var(--vp-c-text-2); font-size: 14px;">
        ViewerPro 本身不支持 Live Photo，需要配合 <code style="padding: 2px 6px; background: var(--vp-c-bg); border-radius: 4px;">live-photo</code> 库来实现。
        第一张图片是 Live Photo（长按或悬停查看动画效果），后两张是普通图片。
      </p>
    </div>
    
    <div class="demo-images">
      <div
        v-for="(img, idx) in images"
        :key="img.src"
        class="demo-image-item"
        @click="openPreview(idx)"
      >
        <img :src="img.thumbnail" :alt="img.title" />
        <div class="demo-image-title">
          {{ img.title }}
          <span v-if="img.type === 'live-photo'" style="margin-left: 6px; font-size: 12px; color: var(--vp-c-brand);">
            📸 Live
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
