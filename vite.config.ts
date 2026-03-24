import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/hsk-ne/',     // ← Tên repo của bạn là hsk-ne, phải có dấu / ở đầu và cuối
})