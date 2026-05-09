# Live Photo 与 BlurHash

ViewerPro 本身只负责预览容器和手势，Live Photo 播放和 BlurHash 渐进占位通过 `renderNode` + `onImageLoad` 组合完成。

<script setup>
import { defineClientComponent } from 'vitepress'

const MediaShowcaseDemo = defineClientComponent(() => {
  return import('./.vitepress/components/MediaShowcaseDemo.vue')
})
</script>

<ClientOnly>
  <MediaShowcaseDemo />
</ClientOnly>

## 数据结构

`ViewerItem` 可扩展任意字段。Live Photo 需要 `videoSrc`，BlurHash 需要 `blurhash` + 原始尺寸：

```typescript
const images: ViewerItem[] = files.map((file) => ({
  src: file.url,
  thumbnail: file.thumbnailUrl,
  title: file.name,
  type: file.type,
  width: file.width,
  height: file.height,
  blurhash: file.blurhash,
  ...(file.type === 'live-photo' ? { photoSrc: file.url, videoSrc: file.videoUrl } : {}),
}))
```

## 自定义渲染

`renderNode` 按 `item.type` 分支：普通图片放 `<img>`，Live Photo 留空容器。两者底层都叠一层 BlurHash `<canvas>` 占位。

```typescript
import { decode } from 'blurhash'

const renderNode = (item, idx) => {
  const frame = document.createElement('div')
  frame.style.position = 'relative'

  // BlurHash 占位
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const px = decode(item.blurhash, 32, 32)
  const img = ctx.createImageData(32, 32)
  img.data.set(px)
  ctx.putImageData(img, 0, 0)
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;transition:opacity 240ms;'
  frame.appendChild(canvas)

  if (item.type === 'live-photo') {
    const box = document.createElement('div')
    box.id = `live-${idx}`
    box.style.cssText = 'position:absolute;inset:0;'
    frame.appendChild(box)
  } else {
    const el = document.createElement('img')
    el.src = item.src
    el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 240ms;'
    el.onload = () => { el.style.opacity = '1'; canvas.remove() }
    frame.appendChild(el)
  }
  return frame
}
```

## 挂载 Live Photo

`onImageLoad` 在图片资源就绪后触发，此时容器已布局到位：

```typescript
import { LivePhotoViewer } from 'live-photo'

const onImageLoad = async (item, idx) => {
  if (item.type !== 'live-photo') return
  const container = document.getElementById(`live-${idx}`)
  if (!container) return
  const { width, height } = container.getBoundingClientRect()
  new LivePhotoViewer({ photoSrc: item.photoSrc, videoSrc: item.videoSrc, container, width, height })
}
```

## 同步变换

```typescript
const onTransformChange = ({ scale, translateX, translateY, rotation, index }) => {
  const el = document.getElementById(`content-${index}`)
  if (el) el.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale}) rotate(${rotation}deg)`
}
```

## 组合

```typescript
const viewer = new ViewerPro({ renderNode, onImageLoad, onTransformChange })
viewer.addImages(images)
viewer.open(0)
```

完整例子见 [playground](https://github.com/iceywu/viewer-pro/tree/main/playground)。
