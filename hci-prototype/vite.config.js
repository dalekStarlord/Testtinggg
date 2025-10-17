import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { env } from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const otpProxyTarget = env.VITE_OTP_URL || 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@mapbox/polyline': path.resolve(__dirname, 'src/utils/polyline.js'),
    },
  },
  server: {
    proxy: {
      '/otp': {
        target: otpProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
