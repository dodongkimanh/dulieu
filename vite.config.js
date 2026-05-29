import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://crm-backend-kimanh.onrender.com',
        changeOrigin: true,
        secure: true,
        headers: {
          origin: 'https://dodongkimanh.vercel.app',
          referer: 'https://dodongkimanh.vercel.app/',
        },
      },
    },
  },
})
