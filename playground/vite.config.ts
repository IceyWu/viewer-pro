import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4001
  },
  resolve: {
    alias: {
      'viewer-pro': resolve(fileURLToPath(new URL('.', import.meta.url)), '../packages/core/src/index.ts')
    }
  }
})
