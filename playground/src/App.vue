<script setup lang="ts">
import { ref, onMounted, nextTick, computed, h, render } from "vue";
import { ViewerPro, type ViewerItem } from "viewer-pro";
import { LivePhotoViewer } from "live-photo";
import { decode } from "blurhash";
import testData from "./assets/data.json";
import ImageMetaPanel from "./components/ImageMetaPanel.vue";
const imagesV2 = computed<ViewerItem[]>(() => {
  return (testData as any).data.files.map((file: any) => {
    const livePhotoVideo = file.live_photo_video;
    const videoSrc =
      livePhotoVideo?.video_variants?.find(
        (variant: any) => variant.quality === "original",
      )?.url ||
      livePhotoVideo?.video_variants?.[0]?.url ||
      livePhotoVideo?.url;
    const imgObj: ViewerItem = {
      ...file,
      src: file.url,
      title: file.name || "",
      thumbnail: `${file.url}?x-oss-process=image/resize,l_800/format,jpg`,
      type: videoSrc ? "live-photo" : file.type,
      blurhash: file.blurhash,
    };
    if (imgObj.type === "live-photo") {
      imgObj.photoSrc = file.url;
      imgObj.videoSrc = videoSrc;
    }
    return imgObj;
  });
});
const previewImages = computed<ViewerItem[]>(() => imagesV2.value.slice(0, 3));

const viewer = ref<ViewerPro | null>(null);
const currentTheme = ref<'dark' | 'light' | 'auto'>('dark');

onMounted(() => {
  init();
});

// 切换主题
const setTheme = (theme: 'dark' | 'light' | 'auto') => {
  currentTheme.value = theme;
  if (viewer.value) {
    viewer.value.setTheme(theme);
  }
};

const createBlurhashCanvas = (hash?: string): HTMLCanvasElement | null => {
  if (!hash) return null;

  const width = 32;
  const height = 32;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.objectFit = "cover";
  canvas.style.transition = "opacity 240ms ease";

  try {
    const pixels = decode(hash, width, height);
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
  } catch {
    return null;
  }

  return canvas;
};

const applyImageFrameSize = (frame: HTMLElement, imgObj: ViewerItem) => {
  const width = Number(imgObj.width);
  const height = Number(imgObj.height);
  const ratio = width > 0 && height > 0 ? width / height : 1;

  const setSize = () => {
    const parent = frame.parentElement;
    if (!parent) return;

    const maxWidth = parent.clientWidth * 0.9;
    const maxHeight = parent.clientHeight * 0.9;
    let frameWidth = maxWidth;
    let frameHeight = frameWidth / ratio;

    if (frameHeight > maxHeight) {
      frameHeight = maxHeight;
      frameWidth = frameHeight * ratio;
    }

    frame.style.width = `${frameWidth}px`;
    frame.style.height = `${frameHeight}px`;
  };

  requestAnimationFrame(setSize);
};

const waitForElementSize = (el: HTMLElement): Promise<DOMRect> =>
  new Promise((resolve) => {
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        resolve(rect);
        return;
      }
      requestAnimationFrame(check);
    };

    check();
  });

const init = async () => {
  const customRender = (imgObj: ViewerItem, idx: number) => {
    const box = document.createElement("div");
    box.id = `custom-render-${idx}`;
    box.style.display = "flex";
    box.style.alignItems = "center";
    box.style.justifyContent = "center";
    box.style.height = "100%";
    box.style.transformOrigin = "center center";
    box.style.willChange = "transform";
    const contentLayer = document.createElement("div");
    contentLayer.id = `custom-render-content-${idx}`;
    contentLayer.style.position = "relative";
    contentLayer.style.zIndex = "1";
    contentLayer.style.display = "flex";
    contentLayer.style.alignItems = "center";
    contentLayer.style.justifyContent = "center";
    contentLayer.style.width = "100%";
    contentLayer.style.height = "100%";
    contentLayer.style.transformOrigin = "center center";
    contentLayer.style.willChange = "transform";
    const createImageFrame = () => {
      const imageFrame = document.createElement("div");
      imageFrame.style.position = "relative";
      imageFrame.style.flex = "0 0 auto";
      const placeholder = createBlurhashCanvas(imgObj.blurhash);
      if (placeholder) {
        imageFrame.appendChild(placeholder);
      }
      applyImageFrameSize(imageFrame, imgObj);
      return { imageFrame, placeholder };
    };
    if (imgObj.type === "live-photo") {
      const { imageFrame, placeholder } = createImageFrame();
      const livePhotoContainer = document.createElement("div");
      livePhotoContainer.id = `live-photo-container-${idx}`;
      livePhotoContainer.style.position = "absolute";
      livePhotoContainer.style.inset = "0";
      livePhotoContainer.style.width = "100%";
      livePhotoContainer.style.height = "100%";
      livePhotoContainer.style.zIndex = "1";
      livePhotoContainer.dataset.placeholderId = `blurhash-placeholder-${idx}`;
      if (placeholder) {
        placeholder.id = `blurhash-placeholder-${idx}`;
      }
      imageFrame.appendChild(livePhotoContainer);
      contentLayer.appendChild(imageFrame);
    } else {
      const { imageFrame, placeholder } = createImageFrame();
      const image = document.createElement("img");
      image.src = imgObj.src;
      image.alt = imgObj.title || "";
      image.style.width = "100%";
      image.style.height = "100%";
      image.style.objectFit = "contain";
      image.style.position = "absolute";
      image.style.inset = "0";
      image.style.zIndex = "1";
      image.style.opacity = placeholder ? "0" : "1";
      image.style.transition = "opacity 240ms ease";
      image.addEventListener("load", () => {
        image.style.opacity = "1";
        if (placeholder) {
          placeholder.remove();
        }
      });
      imageFrame.appendChild(image);
      contentLayer.appendChild(imageFrame);
    }
    box.appendChild(contentLayer);

    return box;
  };

  // 存储已渲染的 Vue 组件容器，用于清理
  const renderedContainers = new Map<number, HTMLElement>();

  // 3. 自定义右侧信息面板渲染
  const infoRender = (imgObj: ViewerItem, idx: number): HTMLElement => {
    // 清理之前的容器（如果存在）
    const oldContainer = renderedContainers.get(idx);
    if (oldContainer) {
      render(null, oldContainer); // 卸载 Vue 组件
    }
    
    // 创建一个新的容器元素
    const container = document.createElement("div");
    container.id = `custom-info-${idx}`;
    container.style.width = "100%";
    container.style.height = "100%";
    
    // 使用 Vue 的 render 函数将 Vue 组件渲染到容器中
    const vnode = h(ImageMetaPanel, { data: imgObj as any });
    render(vnode, container);
    
    // 保存容器引用以便后续清理
    renderedContainers.set(idx, container);
    
    return container;
  };

  await nextTick();
  viewer.value = new ViewerPro({
    renderNode: customRender,
    infoRender,
    onImageLoad: async (imgObj: ViewerItem, idx: number) => {

      if (imgObj.type !== "live-photo") {
        return;
      }
      
      // 对于 live-photo，创建 LivePhotoViewer 实例
      const demoSource = {
        photoSrc: imgObj.photoSrc || "",
        videoSrc: imgObj.videoSrc || "",
      };
      const container = document.getElementById(`live-photo-container-${idx}`);
      if (!container) return;
      const placeholderId = container.dataset.placeholderId;
      const removePlaceholder = () => {
        if (!placeholderId) return;
        document.getElementById(placeholderId)?.remove();
      };
      const rect = await waitForElementSize(container);
      const { width, height } = rect;
      // 创建 LivePhotoViewer 实例
      new LivePhotoViewer({
        photoSrc: demoSource.photoSrc,
        videoSrc: demoSource.videoSrc,
        container: container,
        width,
        height,
        // autoplay: false,
        imageCustomization: {
          styles: {
            objectFit: "cover",
          },
          attributes: {
            alt: "Live Photo Demo",
            loading: "lazy",
          },
        },
      });
      requestAnimationFrame(() => {
        const image = container.querySelector("img");
        if (!image) return;
        if (image.complete) {
          removePlaceholder();
          return;
        }
        image.addEventListener("load", removePlaceholder, { once: true });
      });
    },
    onTransformChange: ({ scale, translateX, translateY, rotation, index }) => {
      const wrapper = document.getElementById(
        `custom-render-${index}`
      ) as HTMLElement | null;
      if (wrapper) {
        wrapper.style.transform = "none";
        wrapper.style.transition = "none";
      }
      const el = document.getElementById(
        `custom-render-content-${index}`
      ) as HTMLElement | null;
      if (!el) return;
      // 使用 rAF 保持流畅
      requestAnimationFrame(() => {
        if (wrapper) {
          wrapper.style.transform = "none";
          wrapper.style.transition = "none";
        }
        el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotation}deg)`;
      });
      // 同步右侧信息面板中的缩放显示
      const scaleEl = document.getElementById(`info-scale-${index}`);
      if (scaleEl) scaleEl.textContent = `${Math.round(scale * 100)}%`;
    },
  });
  viewer.value.addImages(imagesV2.value);
  viewer.value.init();
  
  // 设置初始主题
  viewer.value.setTheme(currentTheme.value);
};

// 点击图片打开预览
function openPreview(idx: number) {
  viewer.value?.open(idx);
}
</script>

<template>
  <div class="container mx-auto py-12 px-4">
    <h1
      class="text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-dark mb-8 text-center"
    >
      高级图片预览组件
    </h1>
    <p class="text-gray-600 mb-8 text-center max-w-3xl mx-auto">
      这是一个功能强大的图片预览组件，支持图片缩放、拖拽、切换、全屏等功能，拥有流畅的动画效果和现代感的UI设计。
    </p>
    
    <!-- 主题切换控制 -->
    <div class="theme-controls mb-8 flex justify-center gap-4">
      <button 
        @click="setTheme('dark')"
        :class="['theme-btn', { active: currentTheme === 'dark' }]"
      >
        <i class="fas fa-moon"></i> 深色主题
      </button>
      <button 
        @click="setTheme('light')"
        :class="['theme-btn', { active: currentTheme === 'light' }]"
      >
        <i class="fas fa-sun"></i> 浅色主题
      </button>
      <button 
        @click="setTheme('auto')"
        :class="['theme-btn', { active: currentTheme === 'auto' }]"
      >
        <i class="fas fa-circle-half-stroke"></i> 自动
      </button>
    </div>
    
    <div class="image-grid">
      <div
        v-for="(img, idx) in previewImages"
        :key="img.src"
        class="image-grid-item"
        @click="openPreview(idx)"
        :data-src="img.src"
        :data-title="img.title"
      >
        <img :src="img.thumbnail" :alt="img.title" />
        <div class="image-grid-item-title">{{ img.title }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css");

/* 主题切换按钮 */
.theme-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.theme-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.theme-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #2563eb;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.theme-btn i {
  font-size: 1.1rem;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  padding: 1rem;
}
.image-grid-item {
  position: relative;
  overflow: hidden;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}
.image-grid-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
.image-grid-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.5s;
}
.image-grid-item:hover img {
  transform: scale(1.05);
}
.image-grid-item-title {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 0.5rem;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0) 100%
  );
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
