<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { ViewerPro, type ImageObj } from "../../src/index";
import "../../src/core/ViewerPro.css";
import { LivePhotoViewer } from "live-photo";

// 示例图片数据
const images: ImageObj[] = [
  {
    src: "https://nest-js.oss-accelerate.aliyuncs.com/nestTest/1/1733058160256.JPEG",
    thumbnail: "https://picsum.photos/id/1015/400/300",
    photoSrc:
      "https://nest-js.oss-accelerate.aliyuncs.com/nestTest/1/1733058160256.JPEG",
    videoSrc:
      "https://nest-js.oss-accelerate.aliyuncs.com/nestTest/1/1733058160657.MOV",
    title: "自然风景",
    type: "live-photo",
  },
  {
    src: "https://nest-js.oss-accelerate.aliyuncs.com/nestTest/1/1746282136181.JPG",
    thumbnail:
      "https://nest-js.oss-accelerate.aliyuncs.com/nestTest/1/1746282136181.JPG",
    title: "自然风景",
  },
  {
    src: "https://picsum.photos/id/1039/1200/800",
    thumbnail: "https://picsum.photos/id/1039/400/300",
    title: "森林小径",
  },
  {
    src: "https://picsum.photos/id/1043/1200/800",
    thumbnail: "https://picsum.photos/id/1043/400/300",
    title: "海岸风景",
  },
  {
    src: "https://picsum.photos/id/1048/1200/800",
    thumbnail: "https://picsum.photos/id/1048/400/300",
    title: "城市夜景",
  },
];

const viewer = ref<ViewerPro | null>(null);

onMounted(() => {
  init();
});

const init = async () => {
  // 1. 自定义 loading：按图片/索引动态返回不同节点
  const customLoading = (imgObj: ImageObj, idx: number) => {
    console.log('🌳-----customLoading-----', imgObj,idx);
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "10px";
    wrap.style.color = "#fff";
    const palette = ["#60A5FA", "#34D399", "#F59E0B", "#EF4444", "#A78BFA"];
    const color = palette[idx % palette.length];

    if (imgObj.type === "live-photo") {
      wrap.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <span>Live Photo 加载中…（第 ${idx + 1} 张）</span>
      `;
    } else {
      wrap.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <span>${imgObj.title || "图片"} 加载中…（第 ${idx + 1} 张）</span>
      `;
    }
    return wrap;
  };

  // 2. 自定义渲染节点
  const customRender = (imgObj: ImageObj, idx: number) => {


    const box = document.createElement("div");
    box.id = `custom-render-${idx}`;
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.justifyContent = "center";
    box.style.height = "100%";
    box.style.transformOrigin = "center center";
    box.style.willChange = "transform";
    if (imgObj.type === "live-photo") {
      box.innerHTML = `
        <div id="live-photo-container-${idx}"></div>
         `;
    } else {
      box.innerHTML = `
          <img src="${
            imgObj.src
          }" style="max-width:90%;max-height:90%;border-radius:12px;box-shadow:0 2px 16px #0004;">
          <div style="color:#fff;margin-top:8px;">自定义渲染：${
            imgObj.title || ""
          }</div>
        `;
    }

    return box;
  };

  // 3. 自定义右侧信息面板渲染
  const infoRender = (imgObj: ImageObj, idx: number): HTMLElement => {
    const wrap = document.createElement("div");
    wrap.id = `custom-info-${idx}`;
    wrap.style.padding = "8px 0";
    wrap.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px;">自定义信息</div>
      <div><b>标题：</b>${imgObj.title || "-"}</div>
      <div><b>类型：</b>${imgObj.type || "image"}</div>
      <div><b>源地址：</b><a href="${
        imgObj.src
      }" target="_blank" style="color:#60a5fa;">打开</a></div>
      <div style="margin-top:8px;"><b>缩放：</b><span id="info-scale-${idx}">100%</span></div>
    `;
    return wrap;
  };

  await nextTick();
  viewer.value = new ViewerPro({
    // 使用按图片/索引的动态 loading
    loadingNode: customLoading,
    renderNode: customRender,
    infoRender,
    onImageLoad: (imgObj: ImageObj, idx: number) => {

      if (imgObj.type !== "live-photo") return;
      const demoSource = {
        photoSrc: imgObj.photoSrc || "",
        videoSrc: imgObj.videoSrc || "",
      };
      const container = document.getElementById(`live-photo-container-${idx}`);
      new LivePhotoViewer({
        photoSrc: demoSource.photoSrc,
        videoSrc: demoSource.videoSrc,
        container: container,
        width: 300,
        height: 300,
        imageCustomization: {
          styles: {
            objectFit: "cover",
            borderRadius: "8px",
          },
          attributes: {
            alt: "Live Photo Demo",
            loading: "lazy",
          },
        },
      });
    },
    onTransformChange: ({ scale, translateX, translateY, index }) => {
      // 让自定义 render 的根节点跟随缩放/位移
      const el = document.getElementById(
        `custom-render-${index}`
      ) as HTMLElement | null;
      if (!el) return;
      // 使用 rAF 保持流畅
      requestAnimationFrame(() => {
        el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      });
      // 同步右侧信息面板中的缩放显示
      const scaleEl = document.getElementById(`info-scale-${index}`);
      if (scaleEl) scaleEl.textContent = `${Math.round(scale * 100)}%`;
    },
  });
  viewer.value.addImages(images);
  viewer.value.init();
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
    <div class="image-grid">
      <div
        v-for="(img, idx) in images"
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
