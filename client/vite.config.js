import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 允许通过 IP 访问
    port: 5173
  },
  test: {
    globals: true,
    environment: 'jsdom',
  }
})
