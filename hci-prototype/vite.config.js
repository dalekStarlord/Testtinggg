import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/otp': {
        target: process.env.VITE_OTP_URL,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
