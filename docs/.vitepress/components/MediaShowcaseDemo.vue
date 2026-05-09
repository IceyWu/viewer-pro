<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ViewerPro, type ViewerItem } from 'viewer-pro'
import { decode } from 'blurhash'
import sampleData from './media-showcase.data.json'

interface SampleFile {
  name: string
  url: string
  width: number
  height: number
  blurhash: string
  type: string
  videoSrc?: string
}

const images = computed<ViewerItem[]>(() =>
  (sampleData.files as SampleFile[]).map((file) => {
    const item: ViewerItem = {
      src: `${file.url}?x-oss-process=image/resize,l_1920/format,jpg/quality,q_85`,
      thumbnail: `${file.url}?x-oss-process=image/resize,l_480/format,jpg`,
      title: file.name,
      type: file.type,
      width: file.width,
      height: file.height,
      blurhash: file.blurhash,
    }
    if (file.type === 'live-photo' && file.videoSrc) {
      item.photoSrc = `${file.url}?x-oss-process=image/resize,l_1920/format,jpg/quality,q_85`
      item.videoSrc = file.videoSrc
    }
    return item
  }),
)

const viewer = ref<ViewerPro | null>(null)

const createBlurhashCanvas = (hash?: string) => {
  if (!hash) return null
  const w = 32
  const h = 32
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  canvas.width = w
  canvas.height = h
  canvas.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'object-fit:cover',
    'transition:opacity 240ms ease',
  ].join(';')
  try {
    const pixels = decode(hash, w, h)
    const imageData = ctx.createImageData(w, h)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    return canvas
  } catch {
    return null
  }
}

const applyFrameSize = (frame: HTMLElement, item: ViewerItem) => {
  const ratio =
    Number(item.width) > 0 && Number(item.height) > 0
      ? Number(item.width) / Number(item.height)
      : 1
  const resize = () => {
    const parent = frame.parentElement
    if (!parent) return
    const maxW = parent.clientWidth * 0.9
    const maxH = parent.clientHeight * 0.9
    let w = maxW
    let h = w / ratio
    if (h > maxH) {
      h = maxH
      w = h * ratio
    }
    frame.style.width = `${w}px`
    frame.style.height = `${h}px`
  }
  requestAnimationFrame(resize)
}

const waitForSize = (el: HTMLElement): Promise<DOMRect> =>
  new Promise((resolve) => {
    const check = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        resolve(rect)
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })

const renderNode = (item: ViewerItem, idx: number) => {
  const wrapper = document.createElement('div')
  wrapper.id = `media-render-${idx}`
  wrapper.style.cssText =
    'display:flex;align-items:center;justify-content:center;height:100%;'

  const content = document.createElement('div')
  content.id = `media-render-content-${idx}`
  content.style.cssText =
    'position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;will-change:transform;transform-origin:center center;'

  const frame = document.createElement('div')
  frame.style.cssText = 'position:relative;flex:0 0 auto;'

  const placeholder = createBlurhashCanvas(item.blurhash as string)
  if (placeholder) {
    placeholder.id = `media-placeholder-${idx}`
    frame.appendChild(placeholder)
  }
  applyFrameSize(frame, item)

  if (item.type === 'live-photo') {
    const box = document.createElement('div')
    box.id = `media-live-${idx}`
    box.style.cssText = 'position:absolute;inset:0;z-index:1;'
    frame.appendChild(box)
  } else {
    const img = document.createElement('img')
    img.src = item.src
    img.alt = item.title || ''
    img.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1;opacity:' +
      (placeholder ? '0' : '1') +
      ';transition:opacity 240ms ease;'
    img.addEventListener('load', () => {
      img.style.opacity = '1'
      placeholder?.remove()
    })
    frame.appendChild(img)
  }

  content.appendChild(frame)
  wrapper.appendChild(content)
  return wrapper
}

const onImageLoad = async (item: ViewerItem, idx: number) => {
  if (item.type !== 'live-photo') return
  if (typeof window === 'undefined') return

  const { LivePhotoViewer } = await import('live-photo')
  const container = document.getElementById(`media-live-${idx}`)
  if (!container) return
  container.innerHTML = ''

  const rect = await waitForSize(container)
  new LivePhotoViewer({
    photoSrc: (item.photoSrc as string) || item.src,
    videoSrc: (item.videoSrc as string) || '',
    container,
    width: rect.width,
    height: rect.height,
    imageCustomization: {
      styles: { objectFit: 'cover' },
      attributes: { alt: (item.title as string) || 'Live Photo', loading: 'lazy' },
    },
  })

  requestAnimationFrame(() => {
    const img = container.querySelector('img')
    const removePlaceholder = () =>
      document.getElementById(`media-placeholder-${idx}`)?.remove()
    if (!img) return
    if (img.complete) {
      removePlaceholder()
      return
    }
    img.addEventListener('load', removePlaceholder, { once: true })
  })
}

const onTransformChange = (state: {
  scale: number
  translateX: number
  translateY: number
  rotation: number
  index: number
}) => {
  const wrapper = document.getElementById(`media-render-${state.index}`)
  const content = document.getElementById(`media-render-content-${state.index}`)
  if (wrapper) {
    wrapper.style.transform = 'none'
    wrapper.style.transition = 'none'
  }
  if (!content) return
  requestAnimationFrame(() => {
    content.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale}) rotate(${state.rotation}deg)`
  })
}

const openPreview = (idx: number) => viewer.value?.open(idx)

onMounted(() => {
  viewer.value = new ViewerPro({
    renderNode,
    onImageLoad,
    onTransformChange,
  })
  viewer.value.addImages(images.value)
})

onUnmounted(() => {
  viewer.value?.destroy()
  viewer.value = null
})
</script>

<template>
  <div class="media-showcase">
    <div class="hint">
      点击任一缩略图打开预览：Live Photo 会在图片加载后自动播放视频；普通图片在大图加载完成前先展示 BlurHash 渐进式占位。
    </div>
    <div class="grid">
      <button
        v-for="(img, idx) in images"
        :key="img.src"
        class="tile"
        type="button"
        @click="openPreview(idx)"
      >
        <img :src="img.thumbnail" :alt="img.title" loading="lazy" />
        <span class="tile-label">
          <span class="tile-title">{{ img.title }}</span>
          <span v-if="img.type === 'live-photo'" class="tile-badge">LIVE</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.media-showcase {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.tile {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 0;
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.tile:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
}

.tile img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.tile-label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: #fff;
  font-size: 12px;
}

.tile-title {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tile-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.25);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
</style>
