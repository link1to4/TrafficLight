import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 關鍵設定：使用相對路徑，確保在 GitHub Pages 子路徑下能正常讀取資源
  build: {
    outDir: 'dist',
  }
})