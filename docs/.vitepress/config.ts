import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ViewerPro",
  description: "现代化的图片预览组件",
  lang: 'zh-CN',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: '示例', link: '/demos/basic' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' }
          ]
        },
        {
          text: '使用',
          items: [
            { text: '示例', link: '/guide/examples' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '概览', link: '/api/' },
            { text: 'ViewerPro', link: '/api/viewer-pro' },
            { text: '类型定义', link: '/api/types' }
          ]
        }
      ],
      '/demos/': [
        {
          text: '示例',
          items: [
            { text: '基础用法', link: '/demos/basic' },
            { text: '自定义', link: '/demos/custom' },
            { text: '高级用法', link: '/demos/advanced' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/iceywu/viewer-pro' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Icey Wu'
    },

    search: {
      provider: 'local'
    }
  }
})
