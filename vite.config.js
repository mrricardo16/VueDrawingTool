import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      input: {
        exclude: ['.env.local'] // 确保 .env.local 不会被打包
      }
    }
  }
})
