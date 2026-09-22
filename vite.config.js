import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // ⭐ 加上這行，確保部署到 GitHub Pages 後不會抓不到資源而白屏
})