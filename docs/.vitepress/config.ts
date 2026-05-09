import { defineConfig } from "vitepress";
import viteConfig from "./vite.config";

export default defineConfig({
  vite: viteConfig,
  title: "ViewerPro",
  description: "现代化的图片预览组件",
  lang: "zh-CN",
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "文档", link: "/docs" },
      { text: "实验台", link: "/playground" },
      { text: "Live Photo", link: "/live-photo" },
    ],

    sidebar: [
      { text: "文档", link: "/docs" },
      { text: "配置实验台", link: "/playground" },
      { text: "Live Photo 与 BlurHash", link: "/live-photo" },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/iceywu/viewer-pro" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present Icey Wu",
    },

    search: {
      provider: "local",
    },
  },
});
