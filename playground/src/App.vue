<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { ViewerPro } from "../../src/index";
import "../../src/core/ViewerPro.css";

// 示例图片数据
const images = [
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
    thumbnail: "https://nest-js.oss-accelerate.aliyuncs.com/nestTest/1/1746282136181.JPG",
    title: "自然风景",
  },
  {
    src: "https://afilmory.innei.in/thumbnails/DSCF4430.webp",
    thumbnail: "https://afilmory.innei.in/thumbnails/DSCF4430.webp",
    title: "山脉与湖泊",
  },
  {
    src: "http://localhost:3000/upload/avatar.jpg",
    thumbnail: "http://localhost:3000/upload/avatar.jpg",
    title: "自然景观",
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

const viewer = ref<any>(null);

onMounted(() => {
  init();
});
const init = async () => {
  // 1. 自定义 loading 节点
  const customLoading = document.createElement("div");
  customLoading.innerHTML = `
        <div style="color: #fff; font-size: 18px; display: flex; flex-direction: column; align-items: center;">
          <svg width="32" height="32" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" stroke="#3B82F6" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
              <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
          <span>图片加载中11111，请稍候...</span>
        </div>
      `;

  // 2. 自定义渲染节点
  const customRender = (imgObj, idx) => {
    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.justifyContent = "center";
    box.style.height = "100%";
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
  await nextTick();
  viewer.value = new ViewerPro({
    images,
    // loadingNode: customLoading,
    // renderNode: customRender,
    // onImageLoad: (imgObj, idx) => {
    //   console.log("图片加载完成:", imgObj, idx);
    //   if (imgObj.type !== "live-photo") return;
    //   const demoSource = {
    //     photoSrc: imgObj.photoSrc || "",
    //     videoSrc: imgObj.videoSrc || "",
    //   };
    //   const container = document.getElementById(`live-photo-container-${idx}`);
    //   new LivePhotoViewer({
    //     photoSrc: demoSource.photoSrc,
    //     videoSrc: demoSource.videoSrc,
    //     container: container,
    //     width: 300,
    //     height: 300,
    //     imageCustomization: {
    //       styles: {
    //         objectFit: "cover",
    //         borderRadius: "8px",
    //       },
    //       attributes: {
    //         alt: "Live Photo Demo",
    //         loading: "lazy",
    //       },
    //     },
    //   });
    // },
  });
  console.log('🦄-----images-----', images);
  viewer.value.addImages(images);
  viewer.value.init();
};

// 点击图片打开预览
function openPreview(idx: number) {
  if (viewer.value) {
    console.log('🍧-----viewer.value-----', viewer.value);
    viewer.value?.open(idx);
  }
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
