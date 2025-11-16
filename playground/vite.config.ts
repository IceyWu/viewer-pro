import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4001
  },
  resolve: {
    alias: {
      'viewer-pro': resolve(__dirname, '../packages/core/src/index.ts')
    }
  }
})
