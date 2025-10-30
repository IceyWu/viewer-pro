import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'viewer-pro': resolve(__dirname, '../../packages/core/src/index.ts')
    }
  }
})
